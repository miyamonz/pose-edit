import { FileLoader, Loader, LoaderUtils } from "three";
import {
  BINARY_EXTENSION_HEADER_MAGIC,
  GLTFBinaryExtension,
} from "./GLTFBinaryExtension";
import { EXTENSIONS } from "./EXTENSIONS";
import { GLTFLightsExtension } from "./GLTFLightsExtension";
import { GLTFMaterialsClearcoatExtension } from "./GLTFMaterialsClearcoatExtension";
import { GLTFMaterialsIorExtension } from "./GLTFMaterialsIorExtension";
import { GLTFMaterialsSheenExtension } from "./GLTFMaterialsSheenExtension";
import { GLTFMaterialsSpecularExtension } from "./GLTFMaterialsSpecularExtension";
import { GLTFMaterialsTransmissionExtension } from "./GLTFMaterialsTransmissionExtension";
import { GLTFMaterialsUnlitExtension } from "./GLTFMaterialsUnlitExtension";
import { GLTFMaterialsVolumeExtension } from "./GLTFMaterialsVolumeExtension";
import { GLTFMeshoptCompression } from "./GLTFMeshoptCompression";
import { GLTFTextureBasisUExtension } from "./GLTFTextureBasisUExtension";
import { GLTFTextureWebPExtension } from "./GLTFTextureWebPExtension";
import { GLTFDracoMeshCompressionExtension } from "./GLTFDracoMeshCompressionExtension";
import { GLTFTextureTransformExtension } from "./GLTFTextureTransformExtension";
import { GLTFMaterialsPbrSpecularGlossinessExtension } from "./GLTFMaterialsPbrSpecularGlossinessExtension";
import { GLTFMeshQuantizationExtension } from "./GLTFMeshQuantizationExtension";
import { GLTFParser } from "./GLTFParser";

class GLTFLoader extends Loader {
  constructor(manager) {
    super(manager);

    this.dracoLoader = null;
    this.ktx2Loader = null;
    this.meshoptDecoder = null;

    this.pluginCallbacks = [];

    this.register(function (parser) {
      return new GLTFMaterialsClearcoatExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFTextureBasisUExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFTextureWebPExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMaterialsSheenExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMaterialsTransmissionExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMaterialsVolumeExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMaterialsIorExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMaterialsSpecularExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFLightsExtension(parser);
    });

    this.register(function (parser) {
      return new GLTFMeshoptCompression(parser);
    });
  }

  load(url, onLoad, onProgress, onError) {
    const scope = this;

    let resourcePath;

    if (this.resourcePath !== "") {
      resourcePath = this.resourcePath;
    } else if (this.path !== "") {
      resourcePath = this.path;
    } else {
      resourcePath = LoaderUtils.extractUrlBase(url);
    }

    // Tells the LoadingManager to track an extra item, which resolves after
    // the model is fully loaded. This means the count of items loaded will
    // be incorrect, but ensures manager.onLoad() does not fire early.
    this.manager.itemStart(url);

    const _onError = function (e) {
      if (onError) {
        onError(e);
      } else {
        console.error(e);
      }

      scope.manager.itemError(url);
      scope.manager.itemEnd(url);
    };

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType("arraybuffer");
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      function (data) {
        try {
          scope.parse(
            data,
            resourcePath,
            function (gltf) {
              onLoad(gltf);

              scope.manager.itemEnd(url);
            },
            _onError
          );
        } catch (e) {
          _onError(e);
        }
      },
      onProgress,
      _onError
    );
  }

  setDRACOLoader(dracoLoader) {
    this.dracoLoader = dracoLoader;
    return this;
  }

  setDDSLoader() {
    throw new Error(
      'THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".'
    );
  }

  setKTX2Loader(ktx2Loader) {
    this.ktx2Loader = ktx2Loader;
    return this;
  }

  setMeshoptDecoder(meshoptDecoder) {
    this.meshoptDecoder = meshoptDecoder;
    return this;
  }

  register(callback) {
    if (this.pluginCallbacks.indexOf(callback) === -1) {
      this.pluginCallbacks.push(callback);
    }

    return this;
  }

  unregister(callback) {
    if (this.pluginCallbacks.indexOf(callback) !== -1) {
      this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
    }

    return this;
  }

  parse(data, path, onLoad, onError) {
    let content;
    const extensions = {};
    const plugins = {};

    if (typeof data === "string") {
      content = data;
    } else {
      const magic = LoaderUtils.decodeText(new Uint8Array(data, 0, 4));

      if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
        try {
          extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(
            data
          );
        } catch (error) {
          if (onError) onError(error);
          return;
        }

        content = extensions[EXTENSIONS.KHR_BINARY_GLTF].content;
      } else {
        content = LoaderUtils.decodeText(new Uint8Array(data));
      }
    }

    const json = JSON.parse(content);

    if (json.asset === undefined || json.asset.version[0] < 2) {
      if (onError)
        onError(
          new Error(
            "THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."
          )
        );
      return;
    }

    const parser = new GLTFParser(json, {
      path: path || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder,
    });

    parser.fileLoader.setRequestHeader(this.requestHeader);

    for (let i = 0; i < this.pluginCallbacks.length; i++) {
      const plugin = this.pluginCallbacks[i](parser);
      plugins[plugin.name] = plugin;

      // Workaround to avoid determining as unknown extension
      // in addUnknownExtensionsToUserData().
      // Remove this workaround if we move all the existing
      // extension handlers to plugin system
      extensions[plugin.name] = true;
    }

    if (json.extensionsUsed) {
      for (let i = 0; i < json.extensionsUsed.length; ++i) {
        const extensionName = json.extensionsUsed[i];
        const extensionsRequired = json.extensionsRequired || [];

        switch (extensionName) {
          case EXTENSIONS.KHR_MATERIALS_UNLIT:
            extensions[extensionName] = new GLTFMaterialsUnlitExtension();
            break;

          case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
            extensions[extensionName] =
              new GLTFMaterialsPbrSpecularGlossinessExtension();
            break;

          case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
            extensions[extensionName] = new GLTFDracoMeshCompressionExtension(
              json,
              this.dracoLoader
            );
            break;

          case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
            extensions[extensionName] = new GLTFTextureTransformExtension();
            break;

          case EXTENSIONS.KHR_MESH_QUANTIZATION:
            extensions[extensionName] = new GLTFMeshQuantizationExtension();
            break;

          default:
            if (
              extensionsRequired.indexOf(extensionName) >= 0 &&
              plugins[extensionName] === undefined
            ) {
              console.warn(
                'THREE.GLTFLoader: Unknown extension "' + extensionName + '".'
              );
            }
        }
      }
    }

    parser.setExtensions(extensions);
    parser.setPlugins(plugins);
    parser.parse(onLoad, onError);
  }

  parseAsync(data, path) {
    const scope = this;

    return new Promise(function (resolve, reject) {
      scope.parse(data, path, resolve, reject);
    });
  }
}

export { GLTFLoader };
