import * as React from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import { ChangeEvent, useState } from 'react'
import { useSharedState } from './state'
import { useLocalStorageString } from './useLocalStorageString'
import { flespiPOST } from './flespiRequest'
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
      const resp = await flespiPOST(sharedState, '/gw/devices', [{ name: 'pvm-plugin-tester', device_type_id: 0, configuration: {} }])
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
