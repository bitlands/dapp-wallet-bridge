import CardanoSerialize from './cardano-serialize'

declare global {
  interface Window { cardano: Cardano; }
}

type Cardano = {
  eternl?: CIP30Connector;
  ccvault?: CIP30Connector;
  nami?: CIP30Connector;
}

type CardanoWalletKey = keyof Cardano;

type CIP30Connector = {
  apiVersion: string;
  icon: string;
  name: string;
  enable: Function;
  isEnabled: Function;
}

type WalletAPI = {
  getBalance: Function
  getUsedAddresses: Function
  getUnusedAddresses: Function
  getChangeAddress: Function
}

function getWallet (walletName: CardanoWalletKey): CIP30Connector | undefined {
  return window.cardano[walletName]
}

export function hasCardano (): boolean {
  return window.cardano !== undefined
}

export function hasWallet (walletName: CardanoWalletKey): boolean {
  return !!getWallet(walletName)
}

export async function isConnected (walletName: CardanoWalletKey): Promise<boolean> {
  const wallet = getWallet(walletName)
  if (!wallet) return false
  return hasWallet(walletName) && (await wallet.isEnabled())
}

export function getIcon (walletName: CardanoWalletKey): string | undefined {
  return getWallet(walletName)?.icon
}

export async function connect (walletName: CardanoWalletKey): Promise<WalletAPI | boolean> {
  const wallet = getWallet(walletName)
  if (!wallet) return false
  try {
    return await wallet.enable()
  } catch {
    return false
  }
}

export async function getAllAssetNames (api: WalletAPI, policyIds: string[]): Promise<string[]> {
  let result = []
  for (const policyId of policyIds) {
    const names = await getAssetNames(api, policyId)
    result.push(...names)
  }
  return result
}

export async function getAssetNames (api: WalletAPI, policyId: string): Promise<string[]> {
  if (!api) return []

  await CardanoSerialize.load()

  const balance = await api.getBalance()
  const value = CardanoSerialize.Cardano.Value.from_bytes(
    Buffer.from(balance, "hex")
  )
  const policyHash = CardanoSerialize.Cardano.ScriptHash.from_bytes(
    CardanoSerialize.Cardano.Ed25519KeyHash.from_bytes(
      Buffer.from(policyId, "hex")
    ).to_bytes()
  )

  const result: Set<string> = new Set()
  const walletMultiasset = value.multiasset()

  if (!walletMultiasset) return []

  const walletAssets = walletMultiasset.get(policyHash)
  if (!walletAssets) return []

  const assetNames = walletAssets.keys()
  for (let i = 0; i < assetNames.len(); i++) {
    result.add(Buffer.from(assetNames.get(i).name()).toString())
  }

  return Array.from(result)
}

export async function getAddress (api: WalletAPI): Promise<string | undefined> {
  if (!api)
    return undefined
  await CardanoSerialize.load()

  let hexAddresses: string[] = []
  hexAddresses.push(...await api.getUsedAddresses())
  if (!hexAddresses.length)
    hexAddresses.push(...await api.getUnusedAddresses())
  if (!hexAddresses.length)
    hexAddresses.push(...await api.getChangeAddress())
  if (!hexAddresses)
    return undefined

  const address = CardanoSerialize.Cardano.Address.from_bytes(
    Buffer.from(hexAddresses[0], "hex")
  ).to_bech32()

  return address
}