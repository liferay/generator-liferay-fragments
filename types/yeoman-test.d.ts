declare module 'yeoman-test' {
  class YeomanTest {
    static run(path: string): typeof YeomanTest;
    static withOptions(options: { [key: string]: any }): typeof YeomanTest;
    static withPrompts(prompts: { [key: string]: any }): typeof YeomanTest;
    static then(callback: (projectPath: string) => void): typeof YeomanTest;
    static catch(callback: (projectPath: string) => void): typeof YeomanTest;
  }

  export = YeomanTest;
}
