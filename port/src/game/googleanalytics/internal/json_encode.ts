// googleanalytics/internal/json_encode.lua — rxi json.lua. Its output only goes
// to the GA queue file, which nothing reads back, so encode reuses defsave's
// rxi encoder and decode is Defold's json.decode.
// PARITY: not a line-by-line translation (unobservable: only written to the in-memory GA queue file).
import { json } from '../../../engine';
import defsaveJson from '../../defsave/json';

const M = {
  encode(val: any): string { return defsaveJson.encode(val); },
  decode(str: string): any { return json.decode(str); },
};

export default M;
