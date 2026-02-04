import type { EquipmentCatalogItem, TankEquipment } from '../data/types';
import type {
  RemoteEquipmentCatalogItem,
  RemoteTankEquipment,
} from './remoteEquipment';

/**
 * Convert Supabase equipment catalog item to app format
 */
export function adaptEquipmentCatalogItem(
  remote: RemoteEquipmentCatalogItem
): EquipmentCatalogItem {
  return {
    id: remote.id,
    slug: remote.slug,
    brand: remote.brand,
    model: remote.model,
    name: remote.name,
    category: remote.category,
    waterType: remote.water_type,
    minTankGal: remote.min_tank_gal,
    maxTankGal: remote.max_tank_gal,
    wattage: remote.wattage,
    flowGph: remote.flow_gph,
    description: remote.description,
    pros: remote.pros,
    cons: remote.cons,
    affiliateUrl: remote.affiliate_url,
    officialUrl: remote.official_url,
    imageKey: remote.image_key,
    isActive: remote.is_active,
    createdAt: remote.created_at,
  };
}

/**
 * Convert Supabase tank equipment to app format
 */
export function adaptTankEquipment(remote: RemoteTankEquipment): TankEquipment {
  return {
    id: remote.id,
    tankId: remote.tank_id,
    equipmentId: remote.equipment_id,
    status: remote.status,
    quantity: remote.quantity,
    notes: remote.notes,
    installedAt: remote.installed_at,
    removedAt: remote.removed_at,
    createdAt: remote.created_at,
    // Convert nested equipment catalog if present
    equipment: remote.equipment_catalog
      ? adaptEquipmentCatalogItem(remote.equipment_catalog)
      : undefined,
  };
}

/**
 * Convert array of equipment catalog items
 */
export function adaptEquipmentCatalogList(
  remoteList: RemoteEquipmentCatalogItem[]
): EquipmentCatalogItem[] {
  return remoteList.map(adaptEquipmentCatalogItem);
}

/**
 * Convert array of tank equipment
 */
export function adaptTankEquipmentList(remoteList: RemoteTankEquipment[]): TankEquipment[] {
  return remoteList.map(adaptTankEquipment);
}
