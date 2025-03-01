[PlayCanvas Editor API](../README.md) / [Exports](../modules.md) / AssetsSchema

# Class: AssetsSchema

Provides methods to access the Assets schema

## Table of contents

### Constructors

- [constructor](AssetsSchema.md#constructor)

### Methods

- [getDefaultData](AssetsSchema.md#getdefaultdata)
- [getFieldsOfType](AssetsSchema.md#getfieldsoftype)

## Public

### getDefaultData

▸ **getDefaultData**(`type`): `any`

Gets default data for asset type

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` | The asset type |

#### Returns

`any`

The default data

#### Defined in

[src/schema/assets.js:25](https://github.com/playcanvas/editor-api/blob/2f0bc85/src/schema/assets.js#L25)

___

### getFieldsOfType

▸ **getFieldsOfType**(`assetType`, `type`): `string`[]

Gets a list of fields of a particular type for an asset type

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `assetType` | `string` | The type of the asset. |
| `type` | `string` | The desired type |

#### Returns

`string`[]

A list of fields

**`Example`**

```javascript
const materialAssetPaths = editor.schema.assets.getFieldsOfType('material', 'asset');
```

#### Defined in

[src/schema/assets.js:55](https://github.com/playcanvas/editor-api/blob/2f0bc85/src/schema/assets.js#L55)

## Internal

### constructor

• **new AssetsSchema**(`schema`): [`AssetsSchema`](AssetsSchema.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `schema` | [`Schema`](Schema.md) | The schema API |

#### Returns

[`AssetsSchema`](AssetsSchema.md)

#### Defined in

[src/schema/assets.js:14](https://github.com/playcanvas/editor-api/blob/2f0bc85/src/schema/assets.js#L14)
