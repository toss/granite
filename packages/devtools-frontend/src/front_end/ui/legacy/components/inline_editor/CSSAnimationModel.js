// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../core/sdk/sdk.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../../ui/legacy/legacy.js';
const cssParser = CodeMirror.css.cssLanguage.parser;
const identifierLonghandMap = new Map(Object.entries({
    'normal': "D" /* LonghandPart.Direction */,
    'alternate': "D" /* LonghandPart.Direction */,
    'reverse': "D" /* LonghandPart.Direction */,
    'alternate-reverse': "D" /* LonghandPart.Direction */,
    'none': "F" /* LonghandPart.FillMode */,
    'forwards': "F" /* LonghandPart.FillMode */,
    'backwards': "F" /* LonghandPart.FillMode */,
    'both': "F" /* LonghandPart.FillMode */,
    'running': "P" /* LonghandPart.PlayState */,
    'paused': "P" /* LonghandPart.PlayState */,
    'infinite': "I" /* LonghandPart.IterationCount */,
    'linear': "E" /* LonghandPart.EasingFunction */,
    'ease': "E" /* LonghandPart.EasingFunction */,
    'ease-in': "E" /* LonghandPart.EasingFunction */,
    'ease-out': "E" /* LonghandPart.EasingFunction */,
    'ease-in-out': "E" /* LonghandPart.EasingFunction */,
}));
function tokenize(text) {
    const textToParse = `*{animation:${text};}`;
    const parsed = cssParser.parse(textToParse);
    // Take the cursor from declaration
    const cursor = parsed.cursorAt(textToParse.indexOf(':') + 1);
    cursor.firstChild();
    cursor.nextSibling();
    const tokens = [];
    while (cursor.nextSibling()) {
        tokens.push(textToParse.substring(cursor.from, cursor.to));
    }
    return tokens;
}
/**
 * For animation shorthand, we can show two swatches:
 * - Easing function swatch (or also called bezier swatch)
 * - Animation name swatch
 * - Variable swatch
 * all the other tokens in the shorthands are rendered as text.
 *
 * This helper model takes an animation shorthand value (`1s linear slide-in`)
 * and finds out which parts to render as "what" by taking its syntax and parsing logic
 * into consideration. Details can be found here: https://w3c.github.io/csswg-drafts/css-animations/#animation.
 *
 * The rule says that whenever there is a keyword that is valid for a property other than
 * `animation-name` whose values are not found earlier in the shorthand must be accepted
 * for those properties rather than for `animation-name`.
 *
 * Beware that, an animation shorthand can contain multiple animation definitions that are
 * separated by a comma (The syntax is animation = <single-animation>#). The above rule only
 * applies to parsing of <single-animation>.
 */
export class CSSAnimationModel {
    parts;
    constructor(parts) {
        this.parts = parts;
    }
    static parse(text, animationNames) {
        const tokens = tokenize(text);
        // `animationNames` can be an array that map to the animation names of
        // different single animations in the order of presence.
        let searchedAnimationNameIndex = 0;
        const parts = [];
        const foundLonghands = {
            ["E" /* LonghandPart.EasingFunction */]: false,
            ["I" /* LonghandPart.IterationCount */]: false,
            ["D" /* LonghandPart.Direction */]: false,
            ["F" /* LonghandPart.FillMode */]: false,
            ["P" /* LonghandPart.PlayState */]: false,
        };
        for (const token of tokens) {
            const matchedLonghandPart = identifierLonghandMap.get(token);
            const matchesToLonghand = matchedLonghandPart && !foundLonghands[matchedLonghandPart];
            let type = "T" /* PartType.Text */;
            if (token.match(UI.Geometry.CubicBezier.Regex) && !foundLonghands["E" /* LonghandPart.EasingFunction */]) {
                type = "EF" /* PartType.EasingFunction */;
            }
            else if (token.match(SDK.CSSMetadata.VariableRegex)) {
                // Note: currently we don't handle resolving variables
                // and putting them in their respective longhand parts.
                // So, having a variable might break the logic for deciding on the
                // `animation-name` if the variable matches to a longhand
                // keyword and the `animation-name` is also the same keyword.
                // This case is very unlikely so we don't handle it for the
                // sake of keeping the implementation clearer.
                type = "V" /* PartType.Variable */;
            }
            else if (token === animationNames[searchedAnimationNameIndex] && !matchesToLonghand) {
                type = "AN" /* PartType.AnimationName */;
            }
            parts.push({
                type,
                value: token,
            });
            // Mark the longhand part as found so that
            // the next identifier that might match to
            // this longhand part shouldn't match.
            if (matchedLonghandPart) {
                foundLonghands[matchedLonghandPart] = true;
            }
            if (token === ',') {
                // `token` being equal to `,` means that parsing of a `<single-animation>`
                // is complete and we start parsing of the next `<single-animation>`.
                // Because of that, we're resetting `foundLonghands` and moving the
                // animation name to match.
                for (const longhandPart of Object.keys(foundLonghands)) {
                    foundLonghands[longhandPart] = false;
                }
                searchedAnimationNameIndex++;
            }
        }
        return new CSSAnimationModel(parts);
    }
}
//# sourceMappingURL=CSSAnimationModel.js.map