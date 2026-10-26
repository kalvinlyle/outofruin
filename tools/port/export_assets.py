#!/usr/bin/env python3
"""Export the Defold archive in game/archive/ into game/port/assets/ for the HTML port.

Usage: python3 tools/port/export_assets.py [--archive DIR] [--out DIR]

Reads game.arci0, game.dmanifest0 and the game.arcd pieces listed in
archive_files.json, decodes every compiled resource by field number using the
Defold 1.2.167 protobuf schemas (proto defaults applied), and writes the files
described in tools/port/README.md. Output is deterministic; the output folder
is rebuilt from scratch on every run.
"""
import argparse
import hashlib
import io
import json
import os
import shutil
import struct
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

from defold_archive import (  # noqa: E402
    xtea_ctr, lz4_block_decompress, pb_fields, read_varint, parse_manifest)

from PIL import Image  # noqa: E402

MAX_HASH = 64

# --------------------------------------------------------------------------
# Schemas. Each message: list of (number, name, kind, label, default).
# kind: float | int32 | uint32 | uint64 | bool | string | bytes
#       | 'enum:<Enum>' | 'msg:<Message>'
# label: opt | req | rep.  default None -> proto2 implicit default.
# --------------------------------------------------------------------------

ENUMS = {
    'NodeType': {0: 'TYPE_BOX', 1: 'TYPE_TEXT', 2: 'TYPE_PIE', 3: 'TYPE_TEMPLATE',
                 4: 'TYPE_SPINE', 5: 'TYPE_PARTICLEFX'},
    'BlendMode': {0: 'BLEND_MODE_ALPHA', 1: 'BLEND_MODE_ADD', 2: 'BLEND_MODE_ADD_ALPHA',
                  3: 'BLEND_MODE_MULT'},
    'ClippingMode': {0: 'CLIPPING_MODE_NONE', 2: 'CLIPPING_MODE_STENCIL'},
    'XAnchor': {0: 'XANCHOR_NONE', 1: 'XANCHOR_LEFT', 2: 'XANCHOR_RIGHT'},
    'YAnchor': {0: 'YANCHOR_NONE', 1: 'YANCHOR_TOP', 2: 'YANCHOR_BOTTOM'},
    'Pivot': {0: 'PIVOT_CENTER', 1: 'PIVOT_N', 2: 'PIVOT_NE', 3: 'PIVOT_E', 4: 'PIVOT_SE',
              5: 'PIVOT_S', 6: 'PIVOT_SW', 7: 'PIVOT_W', 8: 'PIVOT_NW'},
    'AdjustMode': {0: 'ADJUST_MODE_FIT', 1: 'ADJUST_MODE_ZOOM', 2: 'ADJUST_MODE_STRETCH'},
    'SizeMode': {0: 'SIZE_MODE_MANUAL', 1: 'SIZE_MODE_AUTO'},
    'PieBounds': {0: 'PIEBOUNDS_RECTANGLE', 1: 'PIEBOUNDS_ELLIPSE'},
    'AdjustReference': {0: 'ADJUST_REFERENCE_LEGACY', 1: 'ADJUST_REFERENCE_PARENT',
                        2: 'ADJUST_REFERENCE_DISABLED'},
    'Playback': {0: 'PLAYBACK_NONE', 1: 'PLAYBACK_ONCE_FORWARD', 2: 'PLAYBACK_ONCE_BACKWARD',
                 6: 'PLAYBACK_ONCE_PINGPONG', 3: 'PLAYBACK_LOOP_FORWARD',
                 4: 'PLAYBACK_LOOP_BACKWARD', 5: 'PLAYBACK_LOOP_PINGPONG'},
    'TexType': {1: 'TYPE_2D', 2: 'TYPE_CUBEMAP'},
    'CompressionType': {0: 'COMPRESSION_TYPE_DEFAULT', 1: 'COMPRESSION_TYPE_WEBP',
                        2: 'COMPRESSION_TYPE_WEBP_LOSSY'},
    'TextureFormat': {0: 'TEXTURE_FORMAT_LUMINANCE', 1: 'TEXTURE_FORMAT_RGB',
                      2: 'TEXTURE_FORMAT_RGBA', 3: 'TEXTURE_FORMAT_RGB_PVRTC_2BPPV1',
                      4: 'TEXTURE_FORMAT_RGB_PVRTC_4BPPV1', 5: 'TEXTURE_FORMAT_RGBA_PVRTC_2BPPV1',
                      6: 'TEXTURE_FORMAT_RGBA_PVRTC_4BPPV1', 7: 'TEXTURE_FORMAT_RGB_ETC1',
                      8: 'TEXTURE_FORMAT_RGB_16BPP', 9: 'TEXTURE_FORMAT_RGBA_16BPP',
                      10: 'TEXTURE_FORMAT_LUMINANCE_ALPHA'},
    'FontTextureFormat': {0: 'TYPE_BITMAP', 1: 'TYPE_DISTANCE_FIELD'},
    'ConstantType': {0: 'CONSTANT_TYPE_USER', 1: 'CONSTANT_TYPE_VIEWPROJ', 2: 'CONSTANT_TYPE_WORLD',
                     3: 'CONSTANT_TYPE_TEXTURE', 4: 'CONSTANT_TYPE_VIEW',
                     5: 'CONSTANT_TYPE_PROJECTION', 6: 'CONSTANT_TYPE_NORMAL',
                     7: 'CONSTANT_TYPE_WORLDVIEW', 8: 'CONSTANT_TYPE_WORLDVIEWPROJ'},
    'VertexSpace': {0: 'VERTEX_SPACE_WORLD', 1: 'VERTEX_SPACE_LOCAL'},
    'WrapMode': {0: 'WRAP_MODE_REPEAT', 1: 'WRAP_MODE_MIRRORED_REPEAT', 2: 'WRAP_MODE_CLAMP_TO_EDGE'},
    'FilterModeMin': {0: 'FILTER_MODE_MIN_NEAREST', 1: 'FILTER_MODE_MIN_LINEAR',
                      2: 'FILTER_MODE_MIN_NEAREST_MIPMAP_NEAREST',
                      3: 'FILTER_MODE_MIN_NEAREST_MIPMAP_LINEAR',
                      4: 'FILTER_MODE_MIN_LINEAR_MIPMAP_NEAREST',
                      5: 'FILTER_MODE_MIN_LINEAR_MIPMAP_LINEAR'},
    'FilterModeMag': {0: 'FILTER_MODE_MAG_NEAREST', 1: 'FILTER_MODE_MAG_LINEAR'},
    'ShaderLanguage': {1: 'LANGUAGE_GLSL', 2: 'LANGUAGE_SPIRV'},
    'ShaderDataType': {0: 'SHADER_TYPE_UNKNOWN', 1: 'SHADER_TYPE_INT', 2: 'SHADER_TYPE_UINT',
                       3: 'SHADER_TYPE_FLOAT', 4: 'SHADER_TYPE_VEC2', 5: 'SHADER_TYPE_VEC3',
                       6: 'SHADER_TYPE_VEC4', 7: 'SHADER_TYPE_MAT2', 8: 'SHADER_TYPE_MAT3',
                       9: 'SHADER_TYPE_MAT4', 10: 'SHADER_TYPE_SAMPLER2D',
                       11: 'SHADER_TYPE_SAMPLER3D', 12: 'SHADER_TYPE_SAMPLER_CUBE'},
    'PropertyType': {0: 'PROPERTY_TYPE_NUMBER', 1: 'PROPERTY_TYPE_HASH', 2: 'PROPERTY_TYPE_URL',
                     3: 'PROPERTY_TYPE_VECTOR3', 4: 'PROPERTY_TYPE_VECTOR4',
                     5: 'PROPERTY_TYPE_QUAT', 6: 'PROPERTY_TYPE_BOOLEAN', 7: 'PROPERTY_TYPE_COUNT'},
    # input_ddf.proto (not in the scratchpad proto set; Defold 1.2.x values)
    'Mouse': dict([(0, 'MOUSE_WHEEL_UP'), (1, 'MOUSE_WHEEL_DOWN'), (2, 'MOUSE_BUTTON_LEFT'),
                   (3, 'MOUSE_BUTTON_MIDDLE'), (4, 'MOUSE_BUTTON_RIGHT')]
                  + [(4 + i, 'MOUSE_BUTTON_%d' % i) for i in range(1, 9)]),
    'Touch': {0: 'TOUCH_MULTI'},
    'Text': {0: 'TEXT', 1: 'MARKED_TEXT'},
    'Key': {}, 'Gamepad': {},
}

F, I32, U32, U64, B, S, BY = 'float', 'int32', 'uint32', 'uint64', 'bool', 'string', 'bytes'

SCHEMAS = {
    # ddf_math.proto
    'Vector4': [(1, 'x', F, 'opt', 0.0), (2, 'y', F, 'opt', 0.0), (3, 'z', F, 'opt', 0.0),
                (4, 'w', F, 'opt', 0.0)],
    'Vector3': [(1, 'x', F, 'opt', 0.0), (2, 'y', F, 'opt', 0.0), (3, 'z', F, 'opt', 0.0),
                (4, 'd', F, 'opt', 0.0)],
    'Point3': [(1, 'x', F, 'opt', 0.0), (2, 'y', F, 'opt', 0.0), (3, 'z', F, 'opt', 0.0),
               (4, 'd', F, 'opt', 0.0)],
    'Quat': [(1, 'x', F, 'opt', 0.0), (2, 'y', F, 'opt', 0.0), (3, 'z', F, 'opt', 0.0),
             (4, 'w', F, 'opt', 1.0)],
    # gui_ddf.proto
    'NodeDesc': [
        (1, 'position', 'msg:Vector4', 'opt', None), (2, 'rotation', 'msg:Vector4', 'opt', None),
        (3, 'scale', 'msg:Vector4', 'opt', None), (4, 'size', 'msg:Vector4', 'opt', None),
        (5, 'color', 'msg:Vector4', 'opt', None), (6, 'type', 'enum:NodeType', 'opt', None),
        (7, 'blend_mode', 'enum:BlendMode', 'opt', 0), (8, 'text', S, 'opt', None),
        (9, 'texture', S, 'opt', None), (10, 'font', S, 'opt', None), (11, 'id', S, 'opt', None),
        (12, 'xanchor', 'enum:XAnchor', 'opt', 0), (13, 'yanchor', 'enum:YAnchor', 'opt', 0),
        (14, 'pivot', 'enum:Pivot', 'opt', 0), (15, 'outline', 'msg:Vector4', 'opt', None),
        (16, 'shadow', 'msg:Vector4', 'opt', None), (17, 'adjust_mode', 'enum:AdjustMode', 'opt', 0),
        (18, 'line_break', B, 'opt', False), (19, 'parent', S, 'opt', None),
        (20, 'layer', S, 'opt', None), (21, 'inherit_alpha', B, 'opt', False),
        (22, 'slice9', 'msg:Vector4', 'opt', None), (23, 'outerBounds', 'enum:PieBounds', 'opt', 1),
        (24, 'innerRadius', F, 'opt', 0.0), (25, 'perimeterVertices', I32, 'opt', 32),
        (26, 'pieFillAngle', F, 'opt', 360.0), (27, 'clipping_mode', 'enum:ClippingMode', 'opt', 0),
        (28, 'clipping_visible', B, 'opt', True), (29, 'clipping_inverted', B, 'opt', False),
        (30, 'alpha', F, 'opt', 1.0), (31, 'outline_alpha', F, 'opt', 1.0),
        (32, 'shadow_alpha', F, 'opt', 1.0), (33, 'overridden_fields', U32, 'rep', None),
        (34, 'template', S, 'opt', None), (35, 'template_node_child', B, 'opt', None),
        (36, 'text_leading', F, 'opt', 1.0), (37, 'text_tracking', F, 'opt', 0.0),
        (38, 'size_mode', 'enum:SizeMode', 'opt', 0), (39, 'spine_scene', S, 'opt', None),
        (40, 'spine_default_animation', S, 'opt', None), (41, 'spine_skin', S, 'opt', None),
        (42, 'spine_node_child', B, 'opt', False), (43, 'particlefx', S, 'opt', None)],
    'FontDescRef': [(1, 'name', S, 'req', None), (2, 'font', S, 'req', None)],
    'TextureDescRef': [(1, 'name', S, 'req', None), (2, 'texture', S, 'req', None)],
    'LayerDesc': [(1, 'name', S, 'req', None)],
    'LayoutDesc': [(1, 'name', S, 'req', None), (2, 'nodes', 'msg:NodeDesc', 'rep', None)],
    'SpineSceneDesc': [(1, 'name', S, 'req', None), (2, 'spine_scene', S, 'req', None)],
    'ParticleFXDesc': [(1, 'name', S, 'req', None), (2, 'particlefx', S, 'req', None)],
    'SceneDesc': [
        (1, 'script', S, 'req', None), (2, 'fonts', 'msg:FontDescRef', 'rep', None),
        (3, 'textures', 'msg:TextureDescRef', 'rep', None),
        (4, 'background_color', 'msg:Vector4', 'opt', None),
        (6, 'nodes', 'msg:NodeDesc', 'rep', None), (7, 'layers', 'msg:LayerDesc', 'rep', None),
        (8, 'material', S, 'opt', '/builtins/materials/gui.material'),
        (9, 'layouts', 'msg:LayoutDesc', 'rep', None),
        (10, 'adjust_reference', 'enum:AdjustReference', 'opt', 0),
        (11, 'max_nodes', U32, 'opt', 512),
        (12, 'spine_scenes', 'msg:SpineSceneDesc', 'rep', None),
        (13, 'particlefxs', 'msg:ParticleFXDesc', 'rep', None)],
    # texture_set_ddf.proto / tile_ddf.proto
    'TextureSetAnimation': [
        (1, 'id', S, 'req', None), (2, 'width', U32, 'req', None), (3, 'height', U32, 'req', None),
        (4, 'start', U32, 'req', None), (5, 'end', U32, 'req', None), (6, 'fps', U32, 'opt', 30),
        (7, 'playback', 'enum:Playback', 'opt', 1), (8, 'flip_horizontal', U32, 'opt', 0),
        (9, 'flip_vertical', U32, 'opt', 0), (10, 'is_animation', U32, 'opt', 0)],
    'SpriteGeometry': [(1, 'width', U32, 'req', None), (2, 'height', U32, 'req', None),
                       (3, 'vertices', F, 'rep', None), (4, 'uvs', F, 'rep', None),
                       (5, 'indices', U32, 'rep', None)],
    'ConvexHull': [(1, 'index', U32, 'req', 0), (2, 'count', U32, 'req', 0),
                   (3, 'collision_group', S, 'req', 'tile')],
    'TextureSet': [
        (1, 'texture', S, 'req', None), (2, 'animations', 'msg:TextureSetAnimation', 'rep', None),
        (3, 'convex_hulls', 'msg:ConvexHull', 'rep', None), (4, 'tile_width', U32, 'opt', None),
        (5, 'tile_height', U32, 'opt', None), (6, 'tile_count', U32, 'opt', None),
        (16, 'collision_hull_points', F, 'rep', None), (17, 'collision_groups', S, 'rep', None),
        (18, 'tex_coords', BY, 'req', None), (19, 'tex_dims', BY, 'opt', None),
        (20, 'geometries', 'msg:SpriteGeometry', 'rep', None), (21, 'use_geometries', U32, 'opt', None),
        (22, 'frame_indices', U32, 'rep', None)],
    # graphics_ddf.proto
    'TextureImageImage': [
        (1, 'width', U32, 'req', None), (2, 'height', U32, 'req', None),
        (3, 'original_width', U32, 'req', None), (4, 'original_height', U32, 'req', None),
        (5, 'format', 'enum:TextureFormat', 'req', None), (6, 'mip_map_offset', U32, 'rep', None),
        (7, 'mip_map_size', U32, 'rep', None), (8, 'data', BY, 'req', None),
        (9, 'compression_type', 'enum:CompressionType', 'opt', 0),
        (10, 'compression_flags', U64, 'opt', None),
        (11, 'mip_map_size_compressed', U32, 'rep', None)],
    'TextureImage': [(1, 'alternatives', 'msg:TextureImageImage', 'rep', None),
                     (2, 'type', 'enum:TexType', 'req', 1), (3, 'count', U32, 'req', None)],
    'ShaderResourceBinding': [(1, 'name', S, 'req', None), (2, 'type', 'enum:ShaderDataType', 'req', None),
                              (3, 'set', U32, 'opt', 0), (4, 'binding', U32, 'opt', 0)],
    'Shader': [(1, 'language', 'enum:ShaderLanguage', 'req', 1), (2, 'source', BY, 'opt', None),
               (4, 'uniforms', 'msg:ShaderResourceBinding', 'rep', None),
               (5, 'attributes', 'msg:ShaderResourceBinding', 'rep', None)],
    'ShaderDesc': [(1, 'shaders', 'msg:Shader', 'rep', None)],
    # font_ddf.proto
    'Glyph': [(1, 'character', U32, 'req', None), (2, 'width', U32, 'opt', 0),
              (3, 'advance', F, 'opt', 0.0), (4, 'left_bearing', F, 'opt', 0.0),
              (5, 'ascent', U32, 'opt', 0), (6, 'descent', U32, 'opt', 0),
              (7, 'x', I32, 'opt', 0), (8, 'y', I32, 'opt', 0),
              (9, 'glyph_data_offset', U64, 'opt', None), (10, 'glyph_data_size', U64, 'opt', None)],
    'FontMap': [
        (1, 'glyphs', 'msg:Glyph', 'rep', None), (2, 'material', S, 'req', None),
        (6, 'shadow_x', F, 'opt', None), (7, 'shadow_y', F, 'opt', None),
        (8, 'max_ascent', F, 'req', None), (9, 'max_descent', F, 'req', None),
        (10, 'image_format', 'enum:FontTextureFormat', 'opt', 0), (11, 'sdf_spread', F, 'opt', 1.0),
        (12, 'sdf_offset', F, 'opt', 0.0), (13, 'sdf_outline', F, 'opt', 0.0),
        (14, 'sdf_shadow', F, 'opt', 0.0), (15, 'cache_width', U32, 'opt', 0),
        (16, 'cache_height', U32, 'opt', 0), (17, 'glyph_padding', U64, 'opt', None),
        (18, 'cache_cell_width', U32, 'opt', None), (19, 'cache_cell_height', U32, 'opt', None),
        (20, 'glyph_channels', U32, 'opt', None), (21, 'glyph_data', BY, 'opt', None),
        (22, 'alpha', F, 'opt', 1.0), (23, 'outline_alpha', F, 'opt', 1.0),
        (24, 'shadow_alpha', F, 'opt', 1.0), (25, 'cache_cell_max_ascent', U32, 'opt', None),
        (26, 'layer_mask', U32, 'opt', 1)],
    # material_ddf.proto
    'MaterialConstant': [(1, 'name', S, 'req', None), (2, 'type', 'enum:ConstantType', 'req', None),
                         (3, 'value', 'msg:Vector4', 'opt', None)],
    'MaterialSampler': [(1, 'name', S, 'req', None), (2, 'wrap_u', 'enum:WrapMode', 'req', None),
                        (3, 'wrap_v', 'enum:WrapMode', 'req', None),
                        (4, 'filter_min', 'enum:FilterModeMin', 'req', None),
                        (5, 'filter_mag', 'enum:FilterModeMag', 'req', None)],
    'MaterialDesc': [
        (1, 'name', S, 'req', None), (2, 'tags', S, 'rep', None),
        (3, 'vertex_program', S, 'req', None), (4, 'fragment_program', S, 'req', None),
        (5, 'vertex_space', 'enum:VertexSpace', 'opt', None),
        (6, 'vertex_constants', 'msg:MaterialConstant', 'rep', None),
        (7, 'fragment_constants', 'msg:MaterialConstant', 'rep', None),
        (8, 'textures', S, 'rep', None), (9, 'samplers', 'msg:MaterialSampler', 'rep', None)],
    # render_ddf.proto
    'RenderMaterialDesc': [(1, 'name', S, 'req', None), (2, 'material', S, 'req', None)],
    'RenderPrototypeDesc': [(1, 'script', S, 'req', None),
                            (2, 'materials', 'msg:RenderMaterialDesc', 'rep', None)],
    'DisplayProfileQualifier': [(1, 'width', U32, 'req', None), (2, 'height', U32, 'req', None),
                                (3, 'device_models', S, 'rep', None)],
    'DisplayProfile': [(1, 'name', S, 'req', None),
                       (2, 'qualifiers', 'msg:DisplayProfileQualifier', 'rep', None)],
    'DisplayProfiles': [(1, 'profiles', 'msg:DisplayProfile', 'rep', None)],
    # properties_ddf.proto (Defold 1.2.x)
    'PropertyDeclarationEntry': [(1, 'key', S, 'req', None), (2, 'id', U64, 'req', None),
                                 (3, 'element_ids', U64, 'rep', None), (4, 'index', U32, 'req', None)],
    'PropertyDeclarations': [
        (1, 'number_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (2, 'hash_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (3, 'url_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (4, 'vector3_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (5, 'vector4_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (6, 'quat_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (7, 'bool_entries', 'msg:PropertyDeclarationEntry', 'rep', None),
        (8, 'float_values', F, 'rep', None), (9, 'hash_values', U64, 'rep', None),
        (10, 'string_values', S, 'rep', None)],
    # gameobject_ddf.proto
    'PropertyDesc': [(1, 'id', S, 'req', None), (2, 'value', S, 'req', None),
                     (3, 'type', 'enum:PropertyType', 'req', None)],
    'ComponentDesc': [(1, 'id', S, 'req', None), (2, 'component', S, 'req', None),
                      (3, 'position', 'msg:Point3', 'opt', None), (4, 'rotation', 'msg:Quat', 'opt', None),
                      (5, 'properties', 'msg:PropertyDesc', 'rep', None),
                      (6, 'property_decls', 'msg:PropertyDeclarations', 'opt', None)],
    'EmbeddedComponentDesc': [(1, 'id', S, 'req', None), (2, 'type', S, 'req', None),
                              (3, 'data', S, 'req', None), (4, 'position', 'msg:Point3', 'opt', None),
                              (5, 'rotation', 'msg:Quat', 'opt', None)],
    'PrototypeDesc': [(1, 'components', 'msg:ComponentDesc', 'rep', None),
                      (2, 'embedded_components', 'msg:EmbeddedComponentDesc', 'rep', None),
                      (3, 'property_resources', S, 'rep', None)],
    'ComponentPropertyDesc': [(1, 'id', S, 'req', None), (2, 'properties', 'msg:PropertyDesc', 'rep', None),
                              (3, 'property_decls', 'msg:PropertyDeclarations', 'opt', None)],
    'InstanceDesc': [(1, 'id', S, 'req', None), (2, 'prototype', S, 'req', None),
                     (3, 'children', S, 'rep', None), (4, 'position', 'msg:Point3', 'opt', None),
                     (5, 'rotation', 'msg:Quat', 'opt', None),
                     (6, 'component_properties', 'msg:ComponentPropertyDesc', 'rep', None),
                     (7, 'scale', F, 'opt', 1.0), (8, 'scale3', 'msg:Vector3', 'opt', None)],
    'EmbeddedInstanceDesc': [(1, 'id', S, 'req', None), (2, 'children', S, 'rep', None),
                             (3, 'data', S, 'req', None), (4, 'position', 'msg:Point3', 'opt', None),
                             (5, 'rotation', 'msg:Quat', 'opt', None),
                             (6, 'component_properties', 'msg:ComponentPropertyDesc', 'rep', None),
                             (7, 'scale', F, 'opt', 1.0), (8, 'scale3', 'msg:Vector3', 'opt', None)],
    'InstancePropertyDesc': [(1, 'id', S, 'req', None),
                             (2, 'properties', 'msg:ComponentPropertyDesc', 'rep', None)],
    'CollectionInstanceDesc': [(1, 'id', S, 'req', None), (2, 'collection', S, 'req', None),
                               (3, 'position', 'msg:Point3', 'opt', None), (4, 'rotation', 'msg:Quat', 'opt', None),
                               (5, 'scale', F, 'opt', 1.0), (7, 'scale3', 'msg:Vector3', 'opt', None),
                               (6, 'instance_properties', 'msg:InstancePropertyDesc', 'rep', None)],
    'CollectionDesc': [(1, 'name', S, 'req', None), (2, 'instances', 'msg:InstanceDesc', 'rep', None),
                       (3, 'collection_instances', 'msg:CollectionInstanceDesc', 'rep', None),
                       (4, 'scale_along_z', U32, 'opt', 0),
                       (5, 'embedded_instances', 'msg:EmbeddedInstanceDesc', 'rep', None),
                       (6, 'property_resources', S, 'rep', None)],
    # lua_ddf.proto (Defold 1.2.x; not in the scratchpad proto set)
    'LuaSource': [(1, 'script', BY, 'req', None), (2, 'filename', S, 'req', None),
                  (3, 'bytecode', BY, 'opt', None), (4, 'delta', BY, 'opt', None)],
    'LuaModule': [(1, 'source', 'msg:LuaSource', 'req', None), (2, 'modules', S, 'rep', None),
                  (3, 'resources', S, 'rep', None),
                  (4, 'properties', 'msg:PropertyDeclarations', 'opt', None),
                  (5, 'property_resources', S, 'rep', None)],
    # input_ddf.proto (Defold 1.2.x; not in the scratchpad proto set)
    'KeyTrigger': [(1, 'input', 'enum:Key', 'req', None), (2, 'action', S, 'req', None)],
    'MouseTrigger': [(1, 'input', 'enum:Mouse', 'req', None), (2, 'action', S, 'req', None)],
    'GamepadTrigger': [(1, 'input', 'enum:Gamepad', 'req', None), (2, 'action', S, 'req', None)],
    'TouchTrigger': [(1, 'input', 'enum:Touch', 'req', None), (2, 'action', S, 'req', None)],
    'TextTrigger': [(1, 'input', 'enum:Text', 'req', None), (2, 'action', S, 'req', None)],
    'InputBinding': [(1, 'key_trigger', 'msg:KeyTrigger', 'rep', None),
                     (2, 'mouse_trigger', 'msg:MouseTrigger', 'rep', None),
                     (3, 'gamepad_trigger', 'msg:GamepadTrigger', 'rep', None),
                     (4, 'touch_trigger', 'msg:TouchTrigger', 'rep', None),
                     (5, 'text_trigger', 'msg:TextTrigger', 'rep', None)],
}

VECTOR_MSGS = {'Vector4': 4, 'Quat': 4, 'Vector3': 3, 'Point3': 3}
UNKNOWN_FIELDS = set()   # (message, field number, wire type)
PRESENCE_MSGS = {'NodeDesc'}


def _f32(raw):
    return struct.unpack('<f', raw)[0]


def _scalar(kind, wt, v):
    if kind == F:
        return _f32(v)
    if kind == I32:
        return v - (1 << 64) if v >= (1 << 63) else v
    if kind == U32:
        return v & 0xFFFFFFFF
    if kind == B:
        return bool(v)
    if kind == S:
        return v.decode('utf-8')
    if kind == BY:
        return bytes(v)
    return v  # uint32 / uint64 / enum number


def _implicit_default(kind):
    if kind == F:
        return 0.0
    if kind in (I32, U32, U64):
        return 0
    if kind == B:
        return False
    if kind == S:
        return ''
    if kind == BY:
        return b''
    if kind.startswith('enum:'):
        return min(ENUMS[kind[5:]]) if ENUMS[kind[5:]] else 0
    return None


def _packed(kind, v):
    out = []
    if kind == F:
        return [x for x in struct.unpack('<%df' % (len(v) // 4), v)]
    i = 0
    while i < len(v):
        x, i = read_varint(v, i)
        out.append(_scalar(kind, 0, x))
    return out


def decode(buf, msg):
    """Decode protobuf bytes into a dict following SCHEMAS[msg], with defaults."""
    schema = SCHEMAS[msg]
    by_num = {f[0]: f for f in schema}
    vals = {}
    present = []
    unknown = []
    for fn, wt, v in pb_fields(buf):
        f = by_num.get(fn)
        if f is None:
            UNKNOWN_FIELDS.add((msg, fn, wt))
            unknown.append({'field': fn, 'wire_type': wt,
                            'value': v if wt == 0 else bytes(v).hex()})
            continue
        _, name, kind, label, _ = f
        if name not in present:
            present.append(name)
        if kind.startswith('msg:'):
            val = decode(v, kind[4:])
        elif label == 'rep' and wt == 2 and kind not in (S, BY):
            vals.setdefault(name, []).extend(_packed(kind, v))
            continue
        else:
            val = _scalar(kind, wt, v)
        if label == 'rep':
            vals.setdefault(name, []).append(val)
        else:
            vals[name] = val
    out = {}
    for num, name, kind, label, default in schema:
        if label == 'rep':
            val = vals.get(name, [])
        elif name in vals:
            val = vals[name]
        elif kind.startswith('msg:'):
            val = decode(b'', kind[4:])
        else:
            val = default if default is not None else _implicit_default(kind)
        out[name] = val
        if kind.startswith('enum:'):
            names = ENUMS[kind[5:]]
            out[name + '_name'] = ([names.get(x) for x in val] if label == 'rep'
                                   else names.get(val))
    if msg in VECTOR_MSGS:
        keys = ['x', 'y', 'z', 'w'][:VECTOR_MSGS[msg]]
        return [out[k] for k in keys]
    if msg in PRESENCE_MSGS:
        out['_present'] = present
    if unknown:
        out['_unknown'] = unknown
    return out


# --------------------------------------------------------------------------
# Archive reading
# --------------------------------------------------------------------------

def read_archive(archive_dir):
    pieces = json.load(open(os.path.join(archive_dir, 'archive_files.json')))
    files = {}
    for entry in pieces['content']:
        parts = sorted(entry['pieces'], key=lambda p: p['offset'])
        data = b''.join(open(os.path.join(archive_dir, p['name']), 'rb').read() for p in parts)
        assert len(data) == entry['size'], entry['name']
        files[entry['name']] = data
    with tempfile.TemporaryDirectory() as tmp:
        man_path = os.path.join(tmp, 'game.dmanifest')
        with open(man_path, 'wb') as f:
            f.write(files['game.dmanifest'])
        by_hash = parse_manifest(man_path)
    arci, arcd = files['game.arci'], files['game.arcd']
    _, _, _, count, entry_off, hash_off, hash_len = struct.unpack_from('>IIQIIII', arci, 0)
    res = {}
    unnamed = []
    for i in range(count):
        h = arci[hash_off + i * MAX_HASH: hash_off + i * MAX_HASH + hash_len]
        d_off, size, csize, flags = struct.unpack_from('>IIII', arci, entry_off + i * 16)
        compressed = csize != 0xFFFFFFFF
        blob = arcd[d_off:d_off + (csize if compressed else size)]
        if flags & 1:
            blob = xtea_ctr(blob)
        if compressed:
            blob = lz4_block_decompress(blob, size)
        url = by_hash.get(h)
        if url is None:
            unnamed.append(h.hex())
            continue
        res[url] = blob
    return res, unnamed, files['game.projectc']


# --------------------------------------------------------------------------
# Output helpers
# --------------------------------------------------------------------------

class Out:
    def __init__(self, root):
        self.root = root
        self.written = []

    def path(self, rel):
        p = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        self.written.append(rel)
        return p

    def bytes(self, rel, data):
        with open(self.path(rel), 'wb') as f:
            f.write(data)

    def json(self, rel, obj):
        self.bytes(rel, (json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=False) + '\n')
                   .encode('utf-8'))

    def image(self, rel, img, **kw):
        buf = io.BytesIO()
        img.save(buf, **kw)
        self.bytes(rel, buf.getvalue())


def stem(url, ext):
    """'/main/x.guic' -> 'main/x' (drop leading slash and compiled extension)."""
    p = url.lstrip('/')
    assert p.endswith(ext), (url, ext)
    return p[:-len(ext)]


def strip_c(path):
    return path[:-1] if path.endswith('c') else path


def bytes_info(b):
    return {'size': len(b), 'sha256': hashlib.sha256(b).hexdigest()}


# --------------------------------------------------------------------------
# Exporters
# --------------------------------------------------------------------------

def export_scenes(res, out, report):
    for url in sorted(u for u in res if u.endswith('.guic')):
        raw = res[url]
        scene = decode(raw, 'SceneDesc')
        raw_nodes = sum(1 for fn, _, _ in pb_fields(raw) if fn == 6)
        raw_layout_nodes = [sum(1 for fn, _, _ in pb_fields(v) if fn == 2)
                            for fn, wt, v in pb_fields(raw) if fn == 9]
        assert raw_nodes == len(scene['nodes']), url
        assert raw_layout_nodes == [len(l['nodes']) for l in scene['layouts']], url
        doc = {'path': url, 'node_count': raw_nodes}
        doc.update(scene)
        doc['fonts'] = {f['name']: f['font'] for f in scene['fonts']}
        doc['textures'] = {t['name']: t['texture'] for t in scene['textures']}
        doc['layers'] = [l['name'] for l in scene['layers']]
        doc['spine_scenes'] = {s['name']: s['spine_scene'] for s in scene['spine_scenes']}
        doc['particlefxs'] = {p['name']: p['particlefx'] for p in scene['particlefxs']}
        out.json('scenes/%s.json' % stem(url, '.guic'), doc)
        types = {}
        for n in scene['nodes']:
            types[n['type_name']] = types.get(n['type_name'], 0) + 1
        report['scenes'].append({'path': url, 'nodes': raw_nodes, 'types': types,
                                 'layouts': [l['name'] for l in scene['layouts']],
                                 'layout_nodes': raw_layout_nodes,
                                 'templates': sum(1 for n in scene['nodes'] if n['template']),
                                 'template_children': sum(1 for n in scene['nodes'] if n['template_node_child']),
                                 'overridden': sum(1 for n in scene['nodes'] if n['overridden_fields'])})


WEBP_METHOD = 4


def webp_chunks(blob):
    i, out = 12, []
    while i + 8 <= len(blob):
        n = struct.unpack('<I', blob[i + 4:i + 8])[0]
        out.append(blob[i:i + 4].decode('latin1').strip())
        i += 8 + n + (n & 1)
    return out

RAW_MODES = {0: ('L', 1), 1: ('RGB', 3), 2: ('RGBA', 4), 10: ('LA', 2)}


def export_textures(res, out, report):
    for url in sorted(u for u in res if u.endswith('.texturec')):
        base = stem(url, '.texturec')
        ti = decode(res[url], 'TextureImage')
        doc = {'path': url, 'type': ti['type'], 'type_name': ti['type_name'], 'count': ti['count'],
               'alternatives': []}
        for ai, alt in enumerate(ti['alternatives']):
            data = alt['data']
            a = {k: v for k, v in alt.items() if k != 'data'}
            a['data'] = bytes_info(data)
            a['mips'] = []
            prefix = base if ai == 0 else '%s.alt%d' % (base, ai)
            fmt = alt['format']
            for lvl, off in enumerate(alt['mip_map_offset']):
                w = max(1, alt['width'] >> lvl)
                h = max(1, alt['height'] >> lvl)
                usize = alt['mip_map_size'][lvl]
                csizes = alt['mip_map_size_compressed']
                csize = csizes[lvl] if lvl < len(csizes) else 0
                fname = '%s.webp' % prefix if lvl == 0 else '%s.mip%d.webp' % (prefix, lvl)
                if alt['compression_type'] in (1, 2) and csize > 0:
                    blob = data[off:off + csize]
                    img = Image.open(io.BytesIO(blob))
                    img.load()
                    assert img.size == (w, h), (url, lvl, img.size, (w, h))
                    enc = 'webp(%s)' % '+'.join(webp_chunks(blob))
                    mode = RAW_MODES.get(fmt, ('RGBA', 4))[0]
                    pixels = img.convert(mode).tobytes() if img.mode != mode else img.tobytes()
                elif fmt in RAW_MODES:
                    mode, bpp = RAW_MODES[fmt]
                    blob = data[off:off + usize]
                    assert len(blob) == w * h * bpp, (url, lvl)
                    pixels = blob
                    enc = 'raw'
                else:
                    blob = data[off:off + (csize or usize)]
                    fname = fname[:-5] + '.bin'
                    out.bytes('textures/' + fname, blob)
                    enc = 'unhandled-%s' % alt['format_name']
                    pixels = None
                report['tex_formats'].add((alt['format_name'], alt['compression_type_name'], enc))
                if pixels is not None:
                    img = Image.frombytes(mode, (w, h), pixels)
                    out.image('textures/' + fname, img, format='WEBP', lossless=True,
                              exact=True, quality=100, method=WEBP_METHOD)
                    chk = Image.open(os.path.join(out.root, 'textures', fname))
                    assert chk.convert(mode).tobytes() == pixels, (url, lvl, 'webp roundtrip')
                a['mips'].append({'level': lvl, 'width': w, 'height': h, 'file': fname,
                                  'source_encoding': enc, 'source_sha256': hashlib.sha256(blob).hexdigest(), 'offset': off, 'size': usize,
                                  'size_compressed': csize})
            doc['alternatives'].append(a)
        out.json('textures/%s.json' % base, doc)


def export_atlases(res, out, report):
    for url in sorted(u for u in res if u.endswith('.texturesetc')):
        ts = decode(res[url], 'TextureSet')
        tc_raw, td_raw = ts['tex_coords'], ts['tex_dims']
        tc = list(struct.unpack('<%df' % (len(tc_raw) // 4), tc_raw))
        td = list(struct.unpack('<%df' % (len(td_raw) // 4), td_raw)) if td_raw else []
        nframes = len(tc) // 8
        tex_url = ts['texture']
        timg = decode(res[tex_url], 'TextureImage')['alternatives'][0] if tex_url in res else None
        frames = []
        for i in range(nframes):
            q = tc[i * 8:i * 8 + 8]
            for x in q:
                assert 0.0 <= x <= 1.0, (url, i, q)
            rotated = q[0] != q[2] and q[3] != q[5]
            us, vs = q[0::2], q[1::2]
            fr = {'index': i, 'tc': q, 'uv_rotated': rotated,
                  'corners': [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]],
                  'u0': min(us), 'v0': min(vs), 'u1': max(us), 'v1': max(vs)}
            if td:
                fr['dims'] = td[i * 2:i * 2 + 2]
            if timg:
                W, H = timg['width'], timg['height']
                fr['px'] = [round(min(us) * W, 3), round(min(vs) * H, 3),
                            round((max(us) - min(us)) * W, 3), round((max(vs) - min(vs)) * H, 3)]
            if ts['frame_indices']:
                fr['geometry_index'] = ts['frame_indices'][i]
            frames.append(fr)
        anims = []
        for a in ts['animations']:
            a = dict(a)
            a['frames'] = list(range(a['start'], a['end']))
            anims.append(a)
        doc = {'path': url, 'texture': tex_url,
               'texture_size': [timg['width'], timg['height']] if timg else None,
               'texture_original_size': [timg['original_width'], timg['original_height']] if timg else None,
               'frame_count': nframes,
               'animations': anims,
               'animation_index': {a['id']: i for i, a in enumerate(anims)},
               'frames': frames,
               'tex_coords': tc, 'tex_dims': td,
               'geometries': ts['geometries'], 'use_geometries': ts['use_geometries'],
               'frame_indices': ts['frame_indices'], 'convex_hulls': ts['convex_hulls'],
               'collision_hull_points': ts['collision_hull_points'],
               'collision_groups': ts['collision_groups'], 'tile_width': ts['tile_width'],
               'tile_height': ts['tile_height'], 'tile_count': ts['tile_count']}
        if '_unknown' in ts:
            doc['_unknown'] = ts['_unknown']
        out.json('atlases/%s.json' % stem(url, '.texturesetc'), doc)
        report['atlases'].append((url, nframes, len(anims), len(ts['geometries'])))


def export_fonts(res, out, report):
    for url in sorted(u for u in res if u.endswith('.fontc')):
        base = stem(url, '.fontc')
        fm = decode(res[url], 'FontMap')
        gdata = fm['glyph_data']
        ch = fm['glyph_channels'] or 1
        mode = {1: 'L', 3: 'RGB', 4: 'RGBA'}[ch]
        pad = fm['glyph_padding']
        cw, chh = fm['cache_cell_width'], fm['cache_cell_height']
        cols = fm['cache_width'] // cw
        rows = fm['cache_height'] // chh
        cache = Image.new(mode, (fm['cache_width'], fm['cache_height']), 0)
        glyphs = []
        cell = 0
        compressed_any = set()
        for g in fm['glyphs']:
            g = dict(g)
            # ascent/descent are uint32 on the wire but hold int32 values (a glyph that sits
            # wholly above the baseline has a negative descent); the engine casts to int16.
            g['ascent_raw'], g['descent_raw'] = g['ascent'], g['descent']
            for k in ('ascent', 'descent'):
                if g[k] >= 1 << 31:
                    g[k] -= 1 << 32
            blob = gdata[g['glyph_data_offset']:g['glyph_data_offset'] + g['glyph_data_size']]
            bw, bh = g['width'] + pad * 2, g['ascent'] + g['descent'] + pad * 2
            g['bitmap_width'], g['bitmap_height'] = bw, bh
            g['data_compressed'] = bool(blob[0]) if blob else False
            compressed_any.add(g['data_compressed'])
            if g['width'] > 0 and blob:
                body = blob[1:]
                if blob[0]:
                    img = Image.open(io.BytesIO(body))
                    img.load()
                    pix = img.convert(mode).tobytes()
                else:
                    pix = body
                assert len(pix) >= bw * bh * ch, (url, g['character'], len(pix), bw, bh)
                pix = pix[:bw * bh * ch]
                # Engine AddGlyphToCache: cell (col,row) in cursor order, y offset to baseline.
                assert cell < cols * rows, (url, 'cache too small')
                col, row = cell % cols, cell // cols
                off_y = fm['cache_cell_max_ascent'] - g['ascent']
                cx, cy = col * cw, row * chh + off_y
                assert bw <= cw and off_y >= 0 and off_y + bh <= chh, (url, g['character'], 'cell overflow')
                cache.paste(Image.frombytes(mode, (bw, bh), pix), (cx, cy))
                g['cache_cell'] = cell
                g['cache_cell_x'], g['cache_cell_y'] = col * cw, row * chh
                g['cache_offset_y'] = off_y
                g['bitmap_rect'] = [cx, cy, bw, bh]
                g['bitmap_sha256'] = hashlib.sha256(pix).hexdigest()
                cell += 1
            else:
                g['cache_cell'] = None
                g['bitmap_rect'] = None
            glyphs.append(g)
        out.image('fonts/%s.png' % base, cache, format='PNG', optimize=False, compress_level=9)
        doc = {'path': url}
        doc.update({k: v for k, v in fm.items() if k not in ('glyphs', 'glyph_data')})
        doc['glyph_data'] = bytes_info(gdata)
        doc['glyph_data_compressed'] = sorted(compressed_any)
        doc['glyph_data_compression'] = 'per-glyph header byte; 1 = WebP (dmWebP), 0 = raw'
        doc['cache_columns'], doc['cache_rows'] = cols, rows
        doc['cache_image'] = '%s.png' % os.path.basename(base)
        doc['cache_image_mode'] = mode
        doc['glyph_index'] = {str(g['character']): i for i, g in enumerate(glyphs)}
        doc['glyphs'] = glyphs
        out.json('fonts/%s.json' % base, doc)
        report['fonts'].append((url, len(glyphs), sorted(compressed_any), mode))


def export_materials(res, out, report):
    shader_files = {}
    for url in sorted(u for u in res if u.endswith('.vpc') or u.endswith('.fpc')):
        sd = decode(res[url], 'ShaderDesc')
        entries = []
        for i, sh in enumerate(sd['shaders']):
            lang = sh['language_name'] or str(sh['language'])
            ext = '' if len(sd['shaders']) == 1 else '.%s' % lang.lower()
            fname = 'shaders/%s%s' % (strip_c(url.lstrip('/')), ext)
            out.bytes(fname, sh['source'])
            entries.append({'file': fname, 'language': sh['language'], 'language_name': lang,
                            'uniforms': sh['uniforms'], 'attributes': sh['attributes']})
        shader_files[url] = entries
    for url in sorted(u for u in res if u.endswith('.materialc')):
        md = decode(res[url], 'MaterialDesc')
        md = dict(path=url, **md)
        md['vertex_shader'] = shader_files.get(md['vertex_program'])
        md['fragment_shader'] = shader_files.get(md['fragment_program'])
        out.json('materials/%s.json' % stem(url, '.materialc'), md)


def lua_module(res, url):
    lm = decode(res[url], 'LuaModule')
    src = lm['source']
    return lm, src['script']


def export_lua(res, out, report):
    index = {}
    exts = ('.luac', '.gui_scriptc', '.scriptc', '.render_scriptc')
    for url in sorted(u for u in res if u.endswith(exts)):
        lm, script = lua_module(res, url)
        rel = strip_c(url.lstrip('/'))
        if rel.endswith('.lua_'):
            rel = rel[:-1]
        out.bytes('lua/' + rel, script)
        index[url] = {'file': 'lua/' + rel, 'filename': lm['source']['filename'],
                      'has_bytecode': bool(lm['source']['bytecode']),
                      'modules': lm['modules'], 'resources': lm['resources'],
                      'properties': lm['properties'], 'property_resources': lm['property_resources']}
        if '_unknown' in lm or '_unknown' in lm['source']:
            index[url]['_unknown'] = [lm.get('_unknown'), lm['source'].get('_unknown')]
    out.json('lua/index.json', index)
    report['lua'] = len(index)


def parse_ini(text):
    sections = []
    cur = None
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith(('#', ';')):
            continue
        if s.startswith('[') and s.endswith(']'):
            cur = {'name': s[1:-1], 'values': {}}
            sections.append(cur)
        elif '=' in s and cur is not None:
            k, v = s.split('=', 1)
            cur['values'][k.strip()] = v.strip()
    return {sec['name']: sec['values'] for sec in sections}


def export_render(res, out, projectc, original_projectc):
    doc = {}
    for url in sorted(u for u in res if u.endswith('.renderc')):
        doc['render'] = dict(path=url, **decode(res[url], 'RenderPrototypeDesc'))
    rs = [u for u in sorted(res) if u.endswith('.render_scriptc')]
    doc['render_scripts'] = {}
    for url in rs:
        lm, script = lua_module(res, url)
        doc['render_scripts'][url] = {'source': script.decode('utf-8'), 'modules': lm['modules'],
                                      'resources': lm['resources']}
    doc['display_profiles'] = {}
    for url in sorted(u for u in res if u.endswith('.display_profilesc')):
        doc['display_profiles'][url] = decode(res[url], 'DisplayProfiles')
    doc['game_project'] = parse_ini(projectc.decode('utf-8'))
    doc['game_project_text'] = projectc.decode('utf-8')
    if original_projectc is not None and original_projectc != projectc:
        doc['game_project_original'] = parse_ini(original_projectc.decode('utf-8'))
    out.json('render.json', doc)


def export_collection(res, out):
    doc = {'collections': {}, 'game_objects': {}, 'gui_components': []}
    for url in sorted(u for u in res if u.endswith('.collectionc')):
        doc['collections'][url] = decode(res[url], 'CollectionDesc')
    for url in sorted(u for u in res if u.endswith('.goc')):
        doc['game_objects'][url] = decode(res[url], 'PrototypeDesc')
    order = 0
    for curl, col in doc['collections'].items():
        for inst in col['instances']:
            go = doc['game_objects'].get(inst['prototype'])
            for comp in (go or {}).get('components', []):
                doc['gui_components'].append({
                    'order': order, 'collection': curl, 'instance': inst['id'],
                    'instance_position': inst['position'], 'instance_scale3': inst['scale3'],
                    'instance_scale': inst['scale'], 'game_object': inst['prototype'],
                    'component_id': comp['id'], 'component': comp['component'],
                    'component_position': comp['position'],
                    'kind': comp['component'].rsplit('.', 1)[-1]})
                order += 1
    out.json('collection.json', doc)


def export_misc(res, out):
    for url in sorted(u for u in res if u.endswith('.input_bindingc')):
        out.json('input_binding.json', dict(path=url, **decode(res[url], 'InputBinding')))
    for url in sorted(u for u in res if u.endswith('.json')):
        out.bytes('data/' + os.path.basename(url), res[url])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--archive', default=os.path.join(ROOT, 'game', 'archive'))
    ap.add_argument('--original-projectc', default=os.path.join(ROOT, 'game-src', 'archive', 'game.projectc0'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'game', 'port', 'assets'))
    args = ap.parse_args()

    res, unnamed, projectc = read_archive(args.archive)
    if os.path.isdir(args.out):
        shutil.rmtree(args.out)
    os.makedirs(args.out)
    out = Out(args.out)
    report = {'scenes': [], 'atlases': [], 'fonts': [], 'tex_formats': set()}

    export_scenes(res, out, report)
    export_textures(res, out, report)
    export_atlases(res, out, report)
    export_fonts(res, out, report)
    export_materials(res, out, report)
    export_lua(res, out, report)
    orig = None
    if os.path.exists(args.original_projectc):
        orig = open(args.original_projectc, 'rb').read()
    export_render(res, out, projectc, orig)
    export_collection(res, out)
    export_misc(res, out)

    handled = ('.guic', '.texturec', '.texturesetc', '.fontc', '.vpc', '.fpc', '.materialc',
               '.luac', '.gui_scriptc', '.scriptc', '.render_scriptc', '.renderc',
               '.display_profilesc', '.collectionc', '.goc', '.input_bindingc', '.json')
    skipped = sorted(u for u in res if not u.endswith(handled))

    manifest = {'source': {'archive': os.path.relpath(args.archive, ROOT),
                           'resources': len(res), 'unnamed_resources': len(unnamed),
                           'skipped_resources': skipped},
                'files': {}}
    for rel in sorted(set(out.written)):
        b = open(os.path.join(args.out, rel), 'rb').read()
        manifest['files'][rel] = bytes_info(b)
    with open(os.path.join(args.out, 'manifest.json'), 'w') as f:
        f.write(json.dumps(manifest, indent=1, sort_keys=True) + '\n')

    print('resources: %d named, %d unnamed, skipped %s' % (len(res), len(unnamed), skipped))
    print('files written: %d' % len(manifest['files']))
    for s in report['scenes']:
        print('scene %-40s nodes=%-4d %s layouts=%s tmpl=%d tmplchild=%d overridden=%d' % (
            s['path'], s['nodes'], s['types'], s['layouts'], s['templates'],
            s['template_children'], s['overridden']))
    for a in report['atlases']:
        print('atlas %s frames=%d anims=%d geometries=%d' % a)
    for f in report['fonts']:
        print('font %s glyphs=%d compressed=%s mode=%s' % f)
    print('texture formats:', sorted(report['tex_formats']))
    print('lua modules:', report['lua'])
    print('unknown fields:', sorted(UNKNOWN_FIELDS) or 'none')


if __name__ == '__main__':
    main()
