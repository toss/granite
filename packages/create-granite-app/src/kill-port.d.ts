declare module 'kill-port' {
  function killPort(port: number, method?: 'tcp' | 'udp'): Promise<void>;
  export default killPort;
}
