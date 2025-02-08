module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true,
        "jest/globals": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "jest",
        "@typescript-eslint"
    ],
    "globals": {
        "gl": true,
        "GL": true,
        "LS": true,
        "Uint8Array": true,
        "Uint32Array": true,
        "Float32Array": true,
        "LGraphCanvas": true,
        "LGraph": true,
        "LGraphNode": true,
        "LiteGraph": true,
        "LGraphTexture": true,
        "Mesh": true,
        "Shader": true,
        "enableWebGLCanvas": true,
        "vec2": true,
        "vec3": true,
        "vec4": true,
        "DEG2RAD": true,
        "isPowerOfTwo": true,
        "cloneCanvas": true,
        "createCanvas": true,
        "hex2num": true,
        "colorToString": true,
        "showElement": true,
        "quat": true,
        "AudioSynth": true,
        "SillyClient": true
    },
    "rules": {
        "no-console": "off",
        "no-empty": "off",
        "no-redeclare": "off",
        "no-inner-declarations": "off",
        "no-constant-condition": "off",
        "no-unused-vars": "off",
        "no-mixed-spaces-and-tabs": "off",
        "no-unreachable": "off",
        "curly": "off",
        "prefer-const": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-this-alias": "off",
        "no-prototype-builtins": "off",
        "no-fallthrough": "off",
        "@typescript-eslint/no-empty-function": "off",
        "no-cond-assign": "off",
        "valid-typeof": "off"
        // Add any other rules here and set them to "off"
    }
}