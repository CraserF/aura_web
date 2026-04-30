/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.css?raw&inline' {
  const content: string;
  export default content;
}

declare module 'virtual:presentation-scaffold-css/*' {
  const content: string;
  export default content;
}

declare module 'virtual:artifact-pack-css/*' {
  const content: string;
  export default content;
}

declare module '*.js?url' {
  const url: string;
  export default url;
}

declare module '*.wasm?url' {
  const url: string;
  export default url;
}
