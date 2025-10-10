// server/console.ts
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m"
};
function log(event) {
  const { meta, actor, path, patches } = event.data;
  const timestamp = new Date().toLocaleTimeString("ru-RU", { hour12: false });
  const metaStr = meta.padEnd(20);
  const actorStr = actor.padEnd(12);
  const pathStr = path.padEnd(8);
  for (const patch of patches) {
    switch (patch.path) {
      case "/state":
        console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors.cyan}${metaStr}${colors.reset} ${colors.magenta}${actorStr}${colors.reset} ${colors.yellow}${pathStr}${colors.reset} | STATE  | ${colors.magenta}${patch.op.padEnd(8)}${colors.reset} | ${colors.green}${patch.value}${colors.reset}`);
        break;
      case "/context":
        const contextStr = JSON.stringify(patch.value).substring(0, 50);
        console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors.cyan}${metaStr}${colors.reset} ${colors.magenta}${actorStr}${colors.reset} ${colors.yellow}${pathStr}${colors.reset} | CONTEXT| ${colors.magenta}${patch.op.padEnd(8)}${colors.reset} | ${colors.white}${contextStr}${colors.reset}`);
        break;
      case "/":
        console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors.cyan}${metaStr}${colors.reset} ${colors.magenta}${actorStr}${colors.reset} ${colors.yellow}${pathStr}${colors.reset} | ADD    | ${colors.magenta}${patch.op.padEnd(8)}${colors.reset} | ${colors.cyan}${meta}${colors.reset}`);
        break;
      default:
        const path2 = patch.path;
        console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors.cyan}${metaStr}${colors.reset} ${colors.magenta}${actorStr}${colors.reset} ${colors.yellow}${pathStr}${colors.reset} | ${colors.red}${path2.padEnd(7)}${colors.reset} | ${colors.magenta}${patch.op.padEnd(8)}${colors.reset} | ${colors.white}${JSON.stringify(patch.value).substring(0, 30)}${colors.reset}`);
        break;
    }
  }
}
export {
  log
};
