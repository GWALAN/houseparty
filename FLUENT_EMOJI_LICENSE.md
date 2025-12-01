# Microsoft Fluent Emoji License

This application uses Microsoft Fluent Emojis under the MIT License.

## Source

**Repository:** [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji)
**License:** MIT License
**Copyright:** (c) Microsoft Corporation

## MIT License

```
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Attribution

This application displays 3D emoji graphics from the Microsoft Fluent Emoji set to provide a consistent, modern visual experience across all platforms.

The Fluent Emoji system includes over 1,500 emojis designed by Microsoft for Windows 11 and made available to the developer community under the MIT License.

## Learn More

- **Official Repository:** https://github.com/microsoft/fluentui-emoji
- **Documentation:** https://github.com/microsoft/fluentui-emoji/tree/main/assets
- **Design Guidelines:** https://www.microsoft.com/design/fluent/

## Integration in this App

3D emoji PNGs are stored in `/assets/emojis/3d/` and mapped via `/lib/emojiMap.ts`.
The `Emoji3D` component automatically renders Unicode emoji characters as 3D PNG images with graceful fallback to native emojis.
