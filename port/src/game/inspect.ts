// inspect.lua — stand-in: the game only prints its result (see port/TRANSLATING.md).
// inspect(x) and inspect.inspect(x) both return ''.
const inspect: ((root?: unknown, options?: unknown) => string) & {
  _VERSION: string;
  inspect: (root?: unknown, options?: unknown) => string;
} = Object.assign(
  (_root?: unknown, _options?: unknown) => '',
  {
    _VERSION: 'inspect.lua 3.1.0',
    inspect: (_root?: unknown, _options?: unknown) => '',
  },
);

export default inspect;
