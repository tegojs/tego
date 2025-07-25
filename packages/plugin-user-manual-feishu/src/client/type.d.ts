export interface TranslationHook {
  t: (key: string, props?: object) => string;
}
