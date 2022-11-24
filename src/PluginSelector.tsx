import * as React from 'react'
import { Button, TextField } from '@mui/material'
import { ChangeEvent, useState } from 'react'
import { useSharedState } from './state'
import { useLocalStorageString } from './useLocalStorageString'
import { flespiGET, flespiPOST } from './flespiRequest'
import RequestError from './RequestError'

const validatePluginId = (value: string): string => {
  if (!/^\d+$/.test(value)) return 'expecting integer value'
  const num = parseInt(value)
  if (isNaN(num)) return 'expecting integer value'
  if (num <= 0) return 'expecting positive integer value'
  return ''
}

const exampleCode = `move optional .attr ==> %hexstr ==> #attr.decoded

optional .arr ==> array:
	repeat[array_length, counter=$i, from=0]:
		format["prop.%d", $i] ==> $name
		[$i] ==> #param[$name]
unset .arr
`

export default function PluginSelector() {
  const [error, setError] = useState('')

  const [sharedState, setSharedState] = useSharedState()

  const [pluginIdInput, setPluginIdInput] = useLocalStorageString('plugin_id', '')
  const [pluginIdInputValidationError, setPluginIdInputValidationError] = useState<string>('')

  const pluginIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const pluginId = e.target.value
    setPluginIdInput(pluginId)
    setPluginIdInputValidationError(validatePluginId(pluginId))
  }

  const btnSetPluginId = async () => {
    setSharedState({ ...sharedState, loading: true })
    try {
      const plugin = await flespiGET(sharedState, `/gw/plugins/${pluginIdInput}`)
      console.log('plugin', plugin)
      // now assign device to plugin just in case
      const resp = await flespiPOST(sharedState, `/gw/plugins/${plugin.result[0].id}/devices/${sharedState.device_id}`, null)
      console.log('assign', resp)
      setSharedState({ ...sharedState, loading: false, plugin_id: plugin.result[0].id, plugin_code: plugin.result[0].configuration.code })
    } catch (e: any) {
      setSharedState({ ...sharedState, loading: false })
      setError(e.message)
    }
  }

  const btnCreate = async () => {
    setSharedState({ ...sharedState, loading: true })
    try {
      const plugin = await flespiPOST(sharedState, '/gw/plugins', [
        { configuration: { code: exampleCode }, item_type: 11, name: 'pvm-plugin-tester', type_id: 1, enabled: true, required: true },
      ])
      console.log('plugin', plugin)
      // now assign device to plugin
      const assign = await flespiPOST(sharedState, `/gw/plugins/${plugin.result[0].id}/devices/${sharedState.device_id}`, null)
      console.log('assign', assign)
      setPluginIdInput(plugin.result[0].id.toString())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSharedState({ ...sharedState, loading: false })
    }
  }

  return (
    <>
      {sharedState.plugin_id ? (
        <span>Plugin: {sharedState.plugin_id}</span>
      ) : (
        <>
          <TextField
            id="plugin-id"
            key="plugin-id"
            label="Plugin ID"
            size="small"
            value={pluginIdInput}
            onChange={pluginIdChange}
            error={!!pluginIdInputValidationError} // TODO: display validation error
          />
          <Button variant="contained" onClick={btnSetPluginId} disabled={!pluginIdInput || !!pluginIdInputValidationError}>
            Set
          </Button>
          <Button variant="outlined" onClick={btnCreate}>
            Create New
          </Button>
        </>
      )}
      <RequestError error={error} setError={setError} />
    </>
  )
}
