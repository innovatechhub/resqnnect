import type { SupabaseClient } from '@supabase/supabase-js';

export type ReliefInventoryStatus = 'available' | 'low_stock' | 'depleted' | 'archived';

interface ReliefInventoryRow {
  id: string;
  barangay_id: string | null;
  evacuation_center_id: string | null;
  item_name: string;
  unit: string;
  quantity_on_hand: number | string;
  reorder_level: number | string;
  status: string;
  created_at: string;
  updated_at: string;
  evacuation_center?: {
    name: string;
  } | null;
}

interface ReliefDistributionRow {
  id: string;
  relief_inventory_id: string;
  evacuation_center_id: string | null;
  household_id: string | null;
  household_member_id: string | null;
  beneficiary_name: string;
  quantity: number | string;
  released_by: string | null;
  reference_no: string | null;
  distributed_at: string;
  created_at: string;
  updated_at: string;
  relief_inventory?: {
    item_name: string;
    unit: string;
  } | null;
  evacuation_center?: {
    name: string;
  } | null;
  household?: {
    household_code: string | null;
    address_text: string;
  } | null;
  household_member?: {
    full_name: string;
  } | null;
}

export interface ReliefInventoryRecord {
  id: string;
  barangayId: string | null;
  evacuationCenterId: string | null;
  itemName: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  status: ReliefInventoryStatus;
  evacuationCenterName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReliefDistributionRecord {
  id: string;
  reliefInventoryId: string;
  evacuationCenterId: string | null;
  householdId: string | null;
  householdMemberId: string | null;
  reliefItemName: string | null;
  reliefItemUnit: string | null;
  evacuationCenterName: string | null;
  householdLabel: string | null;
  householdMemberName: string | null;
  beneficiaryName: string;
  quantity: number;
  releasedBy: string | null;
  referenceNo: string | null;
  distributedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertReliefInventoryInput {
  barangayId: string | null;
  evacuationCenterId: string | null;
  itemName: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  status?: ReliefInventoryStatus;
}

export interface CreateReliefDistributionInput {
  reliefInventoryId: string;
  evacuationCenterId: string | null;
  householdId: string | null;
  householdMemberId: string | null;
  beneficiaryName: string;
  quantity: number;
  releasedBy: string;
  referenceNo: string | null;
}

const INVENTORY_COLUMNS =
  'id, barangay_id, evacuation_center_id, item_name, unit, quantity_on_hand, reorder_level, status, created_at, updated_at, evacuation_center:evacuation_center_id(name)';
const DISTRIBUTION_COLUMNS =
  'id, relief_inventory_id, evacuation_center_id, household_id, household_member_id, beneficiary_name, quantity, released_by, reference_no, distributed_at, created_at, updated_at, relief_inventory:relief_inventory_id(item_name, unit), evacuation_center:evacuation_center_id(name), household:household_id(household_code, address_text), household_member:household_member_id(full_name)';
const INVENTORY_STATUSES: readonly ReliefInventoryStatus[] = ['available', 'low_stock', 'depleted', 'archived'];

function toNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInventoryStatus(status: string): ReliefInventoryStatus {
  return INVENTORY_STATUSES.includes(status as ReliefInventoryStatus)
    ? (status as ReliefInventoryStatus)
    : 'available';
}

function statusForQuantity(quantity: number, reorderLevel: number): ReliefInventoryStatus {
  if (quantity <= 0) {
    return 'depleted';
  }

  return quantity <= reorderLevel ? 'low_stock' : 'available';
}

function mapInventory(row: ReliefInventoryRow): ReliefInventoryRecord {
  return {
    id: row.id,
    barangayId: row.barangay_id,
    evacuationCenterId: row.evacuation_center_id,
    itemName: row.item_name,
    unit: row.unit,
    quantityOnHand: toNumber(row.quantity_on_hand),
    reorderLevel: toNumber(row.reorder_level),
    status: normalizeInventoryStatus(row.status),
    evacuationCenterName: row.evacuation_center?.name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDistribution(row: ReliefDistributionRow): ReliefDistributionRecord {
  const householdLabel = row.household
    ? row.household.household_code ?? row.household.address_text
    : null;

  return {
    id: row.id,
    reliefInventoryId: row.relief_inventory_id,
    evacuationCenterId: row.evacuation_center_id,
    householdId: row.household_id,
    householdMemberId: row.household_member_id,
    reliefItemName: row.relief_inventory?.item_name ?? null,
    reliefItemUnit: row.relief_inventory?.unit ?? null,
    evacuationCenterName: row.evacuation_center?.name ?? null,
    householdLabel,
    householdMemberName: row.household_member?.full_name ?? null,
    beneficiaryName: row.beneficiary_name,
    quantity: toNumber(row.quantity),
    releasedBy: row.released_by,
    referenceNo: row.reference_no,
    distributedAt: row.distributed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReliefInventory(
  client: SupabaseClient,
  options: { barangayId?: string; evacuationCenterId?: string } = {},
): Promise<ReliefInventoryRecord[]> {
  let query = client.from('relief_inventory').select(INVENTORY_COLUMNS).order('updated_at', { ascending: false });

  if (options.barangayId) {
    query = query.eq('barangay_id', options.barangayId);
  }

  if (options.evacuationCenterId) {
    query = query.eq('evacuation_center_id', options.evacuationCenterId);
  }

  const { data, error } = await query.returns<ReliefInventoryRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapInventory);
}

export async function createReliefInventory(
  client: SupabaseClient,
  input: UpsertReliefInventoryInput,
): Promise<ReliefInventoryRecord> {
  const status = input.status ?? statusForQuantity(input.quantityOnHand, input.reorderLevel);
  const { data, error } = await client
    .from('relief_inventory')
    .insert({
      barangay_id: input.barangayId,
      evacuation_center_id: input.evacuationCenterId,
      item_name: input.itemName,
      unit: input.unit,
      quantity_on_hand: input.quantityOnHand,
      reorder_level: input.reorderLevel,
      status,
    })
    .select(INVENTORY_COLUMNS)
    .single<ReliefInventoryRow>();

  if (error) {
    throw error;
  }

  return mapInventory(data);
}

export async function updateReliefInventory(
  client: SupabaseClient,
  inventoryId: string,
  input: UpsertReliefInventoryInput,
): Promise<ReliefInventoryRecord> {
  const status = input.status ?? statusForQuantity(input.quantityOnHand, input.reorderLevel);
  const { data, error } = await client
    .from('relief_inventory')
    .update({
      barangay_id: input.barangayId,
      evacuation_center_id: input.evacuationCenterId,
      item_name: input.itemName,
      unit: input.unit,
      quantity_on_hand: input.quantityOnHand,
      reorder_level: input.reorderLevel,
      status,
    })
    .eq('id', inventoryId)
    .select(INVENTORY_COLUMNS)
    .single<ReliefInventoryRow>();

  if (error) {
    throw error;
  }

  return mapInventory(data);
}

export async function listReliefDistributions(
  client: SupabaseClient,
  options: { inventoryId?: string; householdId?: string } = {},
): Promise<ReliefDistributionRecord[]> {
  let query = client
    .from('relief_distributions')
    .select(DISTRIBUTION_COLUMNS)
    .order('distributed_at', { ascending: false });

  if (options.inventoryId) {
    query = query.eq('relief_inventory_id', options.inventoryId);
  }

  if (options.householdId) {
    query = query.eq('household_id', options.householdId);
  }

  const { data, error } = await query.returns<ReliefDistributionRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDistribution);
}

export async function createReliefDistribution(
  client: SupabaseClient,
  input: CreateReliefDistributionInput,
): Promise<ReliefDistributionRecord> {
  const inventory = await getReliefInventory(client, input.reliefInventoryId);
  if (input.quantity > inventory.quantityOnHand) {
    throw new Error('Distribution quantity exceeds current inventory.');
  }

  const { data, error } = await client
    .from('relief_distributions')
    .insert({
      relief_inventory_id: input.reliefInventoryId,
      evacuation_center_id: input.evacuationCenterId,
      household_id: input.householdId,
      household_member_id: input.householdMemberId,
      beneficiary_name: input.beneficiaryName,
      quantity: input.quantity,
      released_by: input.releasedBy,
      reference_no: input.referenceNo,
    })
    .select(DISTRIBUTION_COLUMNS)
    .single<ReliefDistributionRow>();

  if (error) {
    throw error;
  }

  const nextQuantity = Math.max(0, inventory.quantityOnHand - input.quantity);
  await updateReliefInventory(client, inventory.id, {
    barangayId: inventory.barangayId,
    evacuationCenterId: inventory.evacuationCenterId,
    itemName: inventory.itemName,
    unit: inventory.unit,
    quantityOnHand: nextQuantity,
    reorderLevel: inventory.reorderLevel,
  });

  return mapDistribution(data);
}

export async function getReliefInventory(
  client: SupabaseClient,
  inventoryId: string,
): Promise<ReliefInventoryRecord> {
  const { data, error } = await client
    .from('relief_inventory')
    .select(INVENTORY_COLUMNS)
    .eq('id', inventoryId)
    .single<ReliefInventoryRow>();

  if (error) {
    throw error;
  }

  return mapInventory(data);
}
