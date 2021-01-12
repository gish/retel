interface GetEnvOptions<T> {
  defaultValue?: string;
  modifier?: (value: string) => T;
}
const getEnv = <T>(name: string, options?: GetEnvOptions<T>): T => {
  const defaultValue = options?.defaultValue ?? "";
  const modifier = options?.modifier ?? ((value: string) => value);
  const value = process.env[name] ?? defaultValue;
  return modifier(value) as T;
};

export default getEnv;
