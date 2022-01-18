/* GLTFREGISTRY */
export function GLTFRegistry() {
    let objects = {};

    return {
        get: function (key) {
            return objects[key];
        },

        add: function (key, object) {
            objects[key] = object;
        },

        remove: function (key) {
            delete objects[key];
        },

        removeAll: function () {
            objects = {};
        },
    };
}
