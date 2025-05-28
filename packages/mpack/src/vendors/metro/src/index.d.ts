// MARK: - GRANITE

declare const Metro: {
  runServer(config: any, options: any): Promise<any>;
  runBuild(config: any, options: any): Promise<any>;
};

export default Metro;
