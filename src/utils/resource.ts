import { randomItem } from "./random";

export class ResourceManager {
  private _resource_map: {
    [resource_type: string]: any[];
  } = {};

  addResource(resource_type: string, resource: any) {
    if (this._resource_map[resource_type]) {
      this._resource_map[resource_type].push(resource);
    } else {
      this._resource_map[resource_type] = [resource];
    }
  }

  useResource(resource_type: string) {
    if (!this._resource_map[resource_type]) {
      throw Error(`Resource: ${resource_type} not enough`);
    }
    return randomItem(this._resource_map[resource_type]);
  }
}

export const RESOURCE_MANAGER = new ResourceManager();
