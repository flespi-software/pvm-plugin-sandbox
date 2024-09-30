import * as React from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import { ChangeEvent, useState } from 'react'
import { useSharedState } from './state'
import { useLocalStorageString } from './useLocalStorageString'
import { flespiGET, flespiPOST } from './flespiRequest'
import RequestError from './RequestError'

const validateDeviceId = (value: string): string => {
  if (!/^\d+$/.test(value)) return 'expecting integer value'
  const num = parseInt(value)
  if (isNaN(num)) return 'expecting integer value'
  if (num <= 0) return 'expecting positive integer value'
  return ''
}

export default function DeviceSelector() {
  const [error, setError] = useState('')

  const [sharedState, setSharedState] = useSharedState()

  const [deviceIdInput, setDeviceIdInput] = useLocalStorageString('device_id', '')
  const [deviceIdInputValidationError, setDeviceIdInputValidationError] = useState<string>('')

  const deviceIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const deviceId = e.target.value
    setDeviceIdInput(deviceId)
    setDeviceIdInputValidationError(validateDeviceId(deviceId))
  }

  const btnSetDeviceId = () => {
    setSharedState({ ...sharedState, device_id: +deviceIdInput })
  }

  const btnCreate = async () => {
    setSharedState({ ...sharedState, loading: true })
    try {
      // NOTE: using first device type of protocol with name=http to get any generic device type
      const dt_resp = await flespiGET(sharedState, '/gw/channel-protocols/name=http/device-types/all?fields=id')
      const device_type_id = dt_resp.result[0].id
      const ident = 'pvm-plugin-tester-ident'
      const resp = await flespiPOST(sharedState, '/gw/devices', [{ name: 'pvm-plugin-tester-name', device_type_id, configuration: { ident } }])
      console.log('resp', resp)
      setDeviceIdInput(resp.result[0].id.toString())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSharedState({ ...sharedState, loading: false })
    }
  }

  return (
    <>
      {sharedState.device_id ? (
        <span>Device: {sharedState.device_id}</span>
      ) : (
        <>
          <TextField
            id="device-id"
            key="device-id"
            label="Device ID"
            size="small"
            value={deviceIdInput}
            onChange={deviceIdChange}
            error={!!deviceIdInputValidationError} // TODO: display validation error
          />
          <Button variant="contained" onClick={btnSetDeviceId} disabled={!deviceIdInput || !!deviceIdInputValidationError}>
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
