// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
export class CSSShadowModel {
    isBoxShadowInternal;
    insetInternal;
    offsetXInternal;
    offsetYInternal;
    blurRadiusInternal;
    spreadRadiusInternal;
    colorInternal;
    format;
    important;
    constructor(isBoxShadow) {
        this.isBoxShadowInternal = isBoxShadow;
        this.insetInternal = false;
        this.offsetXInternal = CSSLength.zero();
        this.offsetYInternal = CSSLength.zero();
        this.blurRadiusInternal = CSSLength.zero();
        this.spreadRadiusInternal = CSSLength.zero();
        this.colorInternal = Common.Color.parse('black');
        this.format = ["X" /* Part.OffsetX */, "Y" /* Part.OffsetY */];
        this.important = false;
    }
    static parseTextShadow(text) {
        return CSSShadowModel.parseShadow(text, false);
    }
    static parseBoxShadow(text) {
        return CSSShadowModel.parseShadow(text, true);
    }
    static parseShadow(text, isBoxShadow) {
        const shadowTexts = [];
        // Split by commas that aren't inside of color values to get the individual shadow values.
        const splits = TextUtils.TextUtils.Utils.splitStringByRegexes(text, [Common.Color.Regex, /,/g]);
        let currentIndex = 0;
        for (let i = 0; i < splits.length; i++) {
            if (splits[i].regexIndex === 1) {
                const comma = splits[i];
                shadowTexts.push(text.substring(currentIndex, comma.position));
                currentIndex = comma.position + 1;
            }
        }
        shadowTexts.push(text.substring(currentIndex, text.length));
        const shadows = [];
        for (let i = 0; i < shadowTexts.length; i++) {
            const shadow = new CSSShadowModel(isBoxShadow);
            shadow.format = [];
            let nextPartAllowed = true;
            const regexes = [/!important/gi, /inset/gi, Common.Color.Regex, CSSLength.Regex];
            const results = TextUtils.TextUtils.Utils.splitStringByRegexes(shadowTexts[i], regexes);
            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.regexIndex === -1) {
                    // Don't allow anything other than inset, color, length values, and whitespace.
                    if (/\S/.test(result.value)) {
                        return [];
                    }
                    // All parts must be separated by whitespace.
                    nextPartAllowed = true;
                }
                else {
                    if (!nextPartAllowed) {
                        return [];
                    }
                    nextPartAllowed = false;
                    if (result.regexIndex === 0) {
                        shadow.important = true;
                        shadow.format.push("M" /* Part.Important */);
                    }
                    else if (result.regexIndex === 1) {
                        shadow.insetInternal = true;
                        shadow.format.push("I" /* Part.Inset */);
                    }
                    else if (result.regexIndex === 2) {
                        const color = Common.Color.parse(result.value);
                        if (!color) {
                            return [];
                        }
                        shadow.colorInternal = color;
                        shadow.format.push("C" /* Part.Color */);
                    }
                    else if (result.regexIndex === 3) {
                        const length = CSSLength.parse(result.value);
                        if (!length) {
                            return [];
                        }
                        const previousPart = shadow.format.length > 0 ? shadow.format[shadow.format.length - 1] : '';
                        if (previousPart === "X" /* Part.OffsetX */) {
                            shadow.offsetYInternal = length;
                            shadow.format.push("Y" /* Part.OffsetY */);
                        }
                        else if (previousPart === "Y" /* Part.OffsetY */) {
                            shadow.blurRadiusInternal = length;
                            shadow.format.push("B" /* Part.BlurRadius */);
                        }
                        else if (previousPart === "B" /* Part.BlurRadius */) {
                            shadow.spreadRadiusInternal = length;
                            shadow.format.push("S" /* Part.SpreadRadius */);
                        }
                        else {
                            shadow.offsetXInternal = length;
                            shadow.format.push("X" /* Part.OffsetX */);
                        }
                    }
                }
            }
            if (invalidCount(shadow, "X" /* Part.OffsetX */, 1, 1) || invalidCount(shadow, "Y" /* Part.OffsetY */, 1, 1) ||
                invalidCount(shadow, "C" /* Part.Color */, 0, 1) || invalidCount(shadow, "B" /* Part.BlurRadius */, 0, 1) ||
                invalidCount(shadow, "I" /* Part.Inset */, 0, isBoxShadow ? 1 : 0) ||
                invalidCount(shadow, "S" /* Part.SpreadRadius */, 0, isBoxShadow ? 1 : 0) ||
                invalidCount(shadow, "M" /* Part.Important */, 0, 1)) {
                return [];
            }
            shadows.push(shadow);
        }
        return shadows;
        function invalidCount(shadow, part, min, max) {
            let count = 0;
            for (let i = 0; i < shadow.format.length; i++) {
                if (shadow.format[i] === part) {
                    count++;
                }
            }
            return count < min || count > max;
        }
    }
    setInset(inset) {
        this.insetInternal = inset;
        if (this.format.indexOf("I" /* Part.Inset */) === -1) {
            this.format.unshift("I" /* Part.Inset */);
        }
    }
    setOffsetX(offsetX) {
        this.offsetXInternal = offsetX;
    }
    setOffsetY(offsetY) {
        this.offsetYInternal = offsetY;
    }
    setBlurRadius(blurRadius) {
        this.blurRadiusInternal = blurRadius;
        if (this.format.indexOf("B" /* Part.BlurRadius */) === -1) {
            const yIndex = this.format.indexOf("Y" /* Part.OffsetY */);
            this.format.splice(yIndex + 1, 0, "B" /* Part.BlurRadius */);
        }
    }
    setSpreadRadius(spreadRadius) {
        this.spreadRadiusInternal = spreadRadius;
        if (this.format.indexOf("S" /* Part.SpreadRadius */) === -1) {
            this.setBlurRadius(this.blurRadiusInternal);
            const blurIndex = this.format.indexOf("B" /* Part.BlurRadius */);
            this.format.splice(blurIndex + 1, 0, "S" /* Part.SpreadRadius */);
        }
    }
    setColor(color) {
        this.colorInternal = color;
        if (this.format.indexOf("C" /* Part.Color */) === -1) {
            this.format.push("C" /* Part.Color */);
        }
    }
    isBoxShadow() {
        return this.isBoxShadowInternal;
    }
    inset() {
        return this.insetInternal;
    }
    offsetX() {
        return this.offsetXInternal;
    }
    offsetY() {
        return this.offsetYInternal;
    }
    blurRadius() {
        return this.blurRadiusInternal;
    }
    spreadRadius() {
        return this.spreadRadiusInternal;
    }
    color() {
        return this.colorInternal;
    }
    asCSSText() {
        const parts = [];
        for (let i = 0; i < this.format.length; i++) {
            const part = this.format[i];
            if (part === "I" /* Part.Inset */ && this.insetInternal) {
                parts.push('inset');
            }
            else if (part === "X" /* Part.OffsetX */) {
                parts.push(this.offsetXInternal.asCSSText());
            }
            else if (part === "Y" /* Part.OffsetY */) {
                parts.push(this.offsetYInternal.asCSSText());
            }
            else if (part === "B" /* Part.BlurRadius */) {
                parts.push(this.blurRadiusInternal.asCSSText());
            }
            else if (part === "S" /* Part.SpreadRadius */) {
                parts.push(this.spreadRadiusInternal.asCSSText());
            }
            else if (part === "C" /* Part.Color */) {
                parts.push(this.colorInternal.getAuthoredText() ?? this.colorInternal.asString());
            }
            else if (part === "M" /* Part.Important */ && this.important) {
                parts.push('!important');
            }
        }
        return parts.join(' ');
    }
}
export class CSSLength {
    amount;
    unit;
    constructor(amount, unit) {
        this.amount = amount;
        this.unit = unit;
    }
    static parse(text) {
        const lengthRegex = new RegExp('^(?:' + CSSLength.Regex.source + ')$', 'i');
        const match = text.match(lengthRegex);
        if (!match) {
            return null;
        }
        if (match.length > 2 && match[2]) {
            return new CSSLength(parseFloat(match[1]), match[2]);
        }
        return CSSLength.zero();
    }
    static zero() {
        return new CSSLength(0, '');
    }
    asCSSText() {
        return this.amount + this.unit;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static Regex = (function () {
        const number = '([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)';
        const unit = '(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)';
        const zero = '[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?';
        return new RegExp(number + unit + '|' + zero, 'gi');
    })();
}
//# sourceMappingURL=CSSShadowModel.js.map