function mappedId(id, mapping) {
    if (mapping.has(id)) {
        return mapping.get(id);
    }
    const lastId = [...mapping.values()].pop() ?? -1;
    mapping.set(id, lastId + 1);
    return lastId + 1;
}
export function stabilizeImpressions(impressions) {
    const mapping = new Map();
    for (const impression of impressions) {
        impression.id = mappedId(impression.id, mapping);
        if (impression.parent) {
            impression.parent = mappedId(impression.parent, mapping);
        }
    }
    return impressions;
}
export function stabilizeEvent(event) {
    event.veid = 0;
    return event;
}
export function stabilizeState(state, mapping = new Map()) {
    const result = { ...state, veid: mappedId(state.veid, mapping) };
    if (result.parent) {
        result.parent = stabilizeState(result.parent, mapping);
    }
    return result;
}
//# sourceMappingURL=VisualLoggingHelpers.js.map