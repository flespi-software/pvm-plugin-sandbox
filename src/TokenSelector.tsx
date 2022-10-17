import * as React from 'react'
import { Button, TextField } from '@mui/material'
import { ChangeEvent, useState } from 'react'
import { useSharedState } from './state'
import { useLocalStorageString } from './useLocalStorageString'

const validateToken = (value: string): string => {
  if (value === '') return 'empty token'
  if (value.length !== 64) return 'expecting FlespiToken of length 64'
  return ''
}

export default function TokenSelector() {
  const [sharedState, setSharedState] = useSharedState()

  const [tokenInput, setTokenInput] = useLocalStorageString('token', '')
  const [tokenInputValidationError, setTokenInputValidationError] = useState<string>('')

  const tokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    const token = e.target.value
    setTokenInput(token)
    setTokenInputValidationError(validateToken(token))
  }

  const btnSetToken = () => {
    setSharedState({ ...sharedState, token: tokenInput })
  }

  return sharedState.token ? (
    <span>Token: {sharedState.token}</span>
  ) : (
    <>
      <TextField
        id="token"
        label="Token"
        size="small"
        style={{ width: '650px' }}
        value={tokenInput}
        onChange={tokenChange}
        error={!!tokenInputValidationError} // TODO: display validation error
      />
      <Button variant="contained" onClick={btnSetToken} disabled={!tokenInput || !!tokenInputValidationError}>
        Set
      </Button>
    </>
  )
}
