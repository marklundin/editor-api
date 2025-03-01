import { globals as api } from './globals.js';
import { Entity } from './entity.js';
import { Events, ObserverList } from '@playcanvas/observer';
import { createEntity } from './entities/create.js';
import { pasteEntities } from './entities/paste.js';
import { duplicateEntities } from './entities/duplicate.js';
import { copyEntities } from './entities/copy.js';
import { reparentEntities } from './entities/reparent.js';
import { deleteEntities } from './entities/delete.js';
import { updateReferences } from './entities/references.js';
import { wait } from './entities/wait.js';
import { addScript, removeScript } from './entities/scripts.js';

/**
 * Data to create new Entity
 *
 * @typedef {object} CreateEntityArguments
 * @property {string} name - The entity name
 * @property {object} components - Component data. See [here](EntityProperties.md) for details on component data.
 * @property {Entity|string} parent - The parent Entity or its resource_id. If undefined then the root Entity will be used as the parent.
 * @property {CreateEntityArguments[]} children - Data for child entities.
 * @property {string[]} tags - Tags for the Entity.
 * @property {boolean} enabled - Whether the Entity should be enabled.
 * @property {string} resource_id - The resource_id of the Entity. Leave undefined to generate a new one.
 * @property {number[]} position - The position of the Entity in local space.
 * @property {number[]} rotation - The rotation of the Entity in local space (euler angles in degrees).
 * @property {number[]} scale - The scale of the Entity in local space.
 */

/**
 * Data to reparent an entity under a new parent
 *
 * @typedef {object} ReparentArguments
 * @property {Entity} entity - The entity to reparent
 * @property {Entity} parent - The new parent for the entity
 * @property {number} index - The child index of the entity under the new parent
 */

/**
 * The entities editor API
 */
class Entities extends Events {
    /**
     * Creates new API instance
     *
     * @category Internal
     */
    constructor() {
        super();

        this._root = null;

        this._entities = new ObserverList({
            index: 'resource_id'
        });
    }

    /**
     * Gets entity by resource id
     *
     * @param {string} id - The entity's resource id
     * @returns {Entity} The entity
     * @example
     * ```javascript
     * const entity = editor.entities.get(resourceId);
     * ```
     */
    get(id) {
        const e = this._entities.get(id);
        return e ? e.apiEntity : null;
    }

    /**
     * Returns array of all entities
     *
     * @returns {Entity[]} The entities
     * @example
     * ```javascript
     * const entities = editor.entities.list();
     * console.log(entities.length);
     * ```
     */
    list() {
        return this._entities.array().map(e => e.apiEntity);
    }

    /**
     * Adds entity to list
     *
     * @category Internal
     * @param {Entity} entity - The entity
     */
    add(entity) {
        const id = entity.get('resource_id');

        if (this.get(id)) {
            console.error(`Cannot add duplicate Entity ${id}`);
            return;
        }

        this._entities.add(entity._observer);
        if (!entity.get('parent')) {
            if (this._root) {
                console.error(`More than one root entities in Scene. Current root is Entity "${this._root.get('name')}" [${this._root.get('resource_id')}] but Entity "${entity.get('name')}" [${id}] also has a null parent`);
            } else {
                this._root = entity;
            }
        }

        entity._initializeHistory();

        this.emit('add', entity, this._root === entity);
    }

    /**
     * Called when an entity is added from the server
     *
     * @category Internal
     * @param {object} entityData - The entity data
     */
    serverAdd(entityData) {
        const entity = new Entity(entityData);
        entity.set('parent', entityData.parent);
        entity.set('children', entityData.children);
        this.add(entity);
    }

    /**
     * Removes entity from the list
     *
     * @category Internal
     * @param {Entity} entity - The entity
     * @param {object} entityReferences - A map of entity references to nullify
     * when this entity is removed
     */
    remove(entity, entityReferences = null) {
        if (entityReferences) {
            updateReferences(entityReferences, entity.get('resource_id'), null);
        }

        // remove children first
        entity.children.forEach((child) => {
            this.remove(child, entityReferences);
        });

        // remove from selection
        if (api.selection && api.selection.has(entity)) {
            api.selection.remove(entity, {
                history: false
            });
        }

        // remove from parent
        if (entity.parent) {
            entity.parent.removeChild(entity);
        }

        // remove from observer list
        try {
            this._entities.remove(entity._observer);
            entity._observer.destroy();
        } catch (err) {
            console.error(err);
        }

        // reset root
        if (this._root === entity) {
            this._root = null;
        }

        // sharedb
        if (api.realtime && api.realtime.scenes.current) {
            api.realtime.scenes.current.removeEntity(entity);
        }

        this.emit('remove', entity);
    }

    /**
     * Called when an entity is removed from the server
     *
     * @category Internal
     * @param {Entity} entity - The entity
     */
    serverRemove(entity) {
        if (api.selection && api.selection.has(entity)) {
            api.selection.remove(entity, {
                history: false
            });
        }

        this._entities.remove(entity._observer);
        entity._observer.destroy();

        if (this._root === entity) {
            this._root = null;
        }

        this.emit('remove', entity);
    }

    /**
     * Removes all entities from the list
     *
     * @category Internal
     */
    clear() {
        this._root = null;
        const entities = this.list();
        this._entities.clear();

        if (api.selection) {
            if (api.selection.items[0] instanceof Entity)  {
                const history = api.selection.history.enabled;
                api.selection.history.enabled = false;
                api.selection.clear();
                api.selection.history.enabled = history;
            }
        }

        entities.forEach((entity) => {
            entity._observer.destroy();
            this.emit('remove', entity);
        });

        this.emit('clear');
    }

    /**
     * Creates new entity and adds it to the hierarchy
     *
     * @param {CreateEntityArguments} data - Initial data for the entity
     * @param {object} options - Options
     * @param {number} options.index - The child index that this entity will have under its parent.
     * @param {boolean} options.history - Whether to record a history action. Defaults to true.
     * @param {boolean} options.select - Whether to select new Entity. Defaults to false.
     * @returns {Entity} The new entity
     *
     * @example
     * ```javascript
     * const root = editor.entities.create({
     *     name: 'parent',
     * });
     *
     * const child = editor.entities.create({
     *     name: 'child',
     *     parent: root,
     * });
     *```
     */
    create(data = null, options = {}) {
        return createEntity(data, options);
    }

    /**
     * Delete specified entities
     *
     * @param {Entity[]|Entity} entities - The entities
     * @param {object} options - Options
     * @param {boolean} options.history - Whether to record a history action. Defaults to true.
     *
     * @example
     * ```javascript
     * await editor.entities.delete([entity1, entity2]);
     * ```
     */
    async delete(entities, options = {}) {
        await deleteEntities(entities, options);
    }

    /**
     * Reparents entities under new parent.
     *
     * @param {ReparentArguments[]} data - The reparenting data
     * @param {object} options - Options
     * @param {boolean} options.preserveTransform - Whether to preserve the transform of the entities. Defaults to false.
     * @param {boolean} options.history - Whether to record history. Defaults to true
     * @example
     * ```javascript
     * const child = editor.entities.create();
     * const parent = editor.entities.create();
     * editor.entities.reparent([{
     *     entity: child,
     *     parent: parent
     * }])
     * ```
     */
    reparent(data, options = {}) {
        reparentEntities(data, options);
    }

    /**
     * Duplicates the specified entities under the same parent
     *
     * @param {Entity[]} entities - The entities
     * @param {object} [options] - Options
     * @param {boolean} [options.history] - Whether to record a history action. Defaults to true.
     * @param {boolean} [options.select] - Whether to select the new entities. Defaults to false.
     * @param {boolean} [options.rename] - Whether to rename the duplicated entities. Defaults to false.
     * @returns {Promise<Entity[]>} The duplicated entities
     * @example
     * const duplicated = await editor.entities.duplicate(entities);
     */
    async duplicate(entities, options = {}) {
        const result = await duplicateEntities(entities, options);
        return result;

    }

    /**
     * Copy specified entities to localStorage clipboard. Can be used
     * to paste these entities later on.
     *
     * @param {Entity[]} entities - The entities
     */
    copyToClipboard(entities) {
        copyEntities(entities);
    }

    /**
     * Paste entities copied into clipboard
     * under the specified parent.
     *
     * @param {Entity} parent - The parent
     * @param {object} options - Options
     * @param {boolean} options.history - Whether to record a history action. Defaults to true.
     * @returns {Promise<Entity[]>} The new entities
     */
    pasteFromClipboard(parent, options = {}) {
        return pasteEntities(parent, options);
    }

    /**
     * Waits for specified entity ids to be added to the scene.
     * Once they are the callback is called with the entities as its argument.
     *
     * @param {string[]} entityIds - The ids of the entities to wait for
     * @param {number} timeoutMs - Number of ms to wait before stopping to wait
     * @param {Function} callback - The callback to call when all entities have been added.
     * The signature is (Entity[]) => void.
     * @returns {Function} Returns a cancel function which can be called to cancel calling the
     * callback when the entities are added.
     */
    waitToExist(entityIds, timeoutMs, callback) {
        return wait(entityIds, timeoutMs, callback);
    }

    /**
     * Like {@link Entity.addScript} but works on multiple entities using
     * a single history action.
     *
     * @param {Entity[]} entities - The entities.
     * @param {string} scriptName - The name of the script.
     * @param {object} options - Options
     * @param {object} options.attributes - The values of attributes. Each key is the name
     * of the attributes and each value is the value for that attribute. Leave undefined to
     * let the Editor set default values depending on the attribute types.
     * @param {boolean} options.history - Whether to add a history action. Defaults to true.
     * @param {number} options.index - The desired index in the entity's scripts order to add this script.
     * @returns {Promise<>} A promise
     */
    addScript(entities, scriptName, options = {}) {
        return addScript(entities, scriptName, options);
    }

    /**
     * Like {@link Entity.removeScript} but works on multiple entities using
     * a single history action.
     *
     * @param {Entity[]} entities - The entities.
     * @param {string} scriptName - The name of the script.
     * @param {object} options - Options
     * @param {boolean} options.history - Whether to record a history action. Defaults to true.
     */
    removeScript(entities, scriptName, options = {}) {
        removeScript(entities, scriptName, options);
    }

    /**
     * @type {Entity}
     * Gets the root Entity
     */
    get root() {
        return this._root;
    }
}

export { Entities };
