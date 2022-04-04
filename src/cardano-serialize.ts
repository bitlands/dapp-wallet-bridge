class CardanoSerialize {
  _wasm: any
  _wasm2: any

  async load() {
    if (this._wasm && this._wasm2) 
      return

    this._wasm = await import(
      '@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib'
    )
  }

  get Cardano () {
    return this._wasm
  }
}

export default new CardanoSerialize()