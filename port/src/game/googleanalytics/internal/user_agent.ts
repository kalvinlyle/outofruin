// googleanalytics/internal/user_agent.lua
import { sys } from '../../../engine';
import { S, format } from '../../../lua';

const M: any = {};

M.get = function (): string | undefined {
  const sys_info = sys.get_sys_info();
  const device_model = sys_info.device_model;
  const manufacturer = sys_info.manufacturer;
  const system_name = sys_info.system_name;
  const system_version = sys_info.system_version;
  const system_version_underscore = S.gsub(system_version, "%.", "_")[0];
  const api_version = sys_info.api_version;
  const device_language = sys_info.device_language;
  void api_version; void device_language;

  const engine_info = sys.get_engine_info();
  const engine_version = engine_info.version;

  let user_agent: string | undefined;
  if (sys_info.system_name === "Android") {
    user_agent = format("Mozilla/5.0 (Linux; Android %s; %s %s) AppleWebKit/537.36 (KHTML, like Gecko) Defold/%s", system_version, manufacturer, device_model, engine_version);
  } else if (sys_info.system_name === "iPhone OS") {
    if (S.match1(sys_info.device_model, "iPad.*") === sys_info.device_model) {
      user_agent = format("Mozilla/5.0 (iPad; CPU OS %s like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Defold/%s", system_version_underscore, engine_version);
    } else if (S.match1(sys_info.device_model, "iPod.*") === sys_info.device_model) {
      user_agent = format("Mozilla/5.0 (iPod; CPU OS %s like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Defold/%s", system_version_underscore, engine_version);
    } else {
      user_agent = format("Mozilla/5.0 (iPhone; CPU iPhone OS %s like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Defold/%s", system_version_underscore, engine_version);
    }
  } else if (sys_info.system_name === "Darwin") {
    user_agent = format("Mozilla/5.0 (Macintosh; Intel Mac OS X %s) AppleWebKit/602.3.12 (KHTML, like Gecko) Defold/%s", system_version, engine_version);
  } else if (sys_info.system_name === "Windows") {
    user_agent = format("Mozilla/5.0 (MSIE 10.0; Windows NT %s; Trident/5.0) Defold/%s", system_version, engine_version);
  } else if (sys_info.system_name === "Linux") {
    user_agent = format("Mozilla/5.0 (X11; Linux x86_64; Debian) AppleWebKit/537.36 (KHTML, like Gecko) Defold/%s", engine_version);
  } else if (sys_info.system_name === "HTML5") {
    user_agent = undefined;
  } else {
    user_agent = format("Mozilla/5.0 (%s; %s; %s %s) Defold/%s", system_name, system_version, device_model, manufacturer, engine_version);
  }
  return user_agent;
};

export default M;
