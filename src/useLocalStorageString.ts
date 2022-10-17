import { Dispatch, SetStateAction } from 'react'
import { useLocalStorage } from 'react-use'

export const useLocalStorageString = (key: string, initial: string): [string, Dispatch<SetStateAction<string>>] => {
  const [value, setValue] = useLocalStorage(key, initial, { raw: true })
  const setValueNoUndefined: Dispatch<SetStateAction<string>> = (value: any): void => {
    setValue(value)
  }
  if (value === undefined) return ['', setValueNoUndefined]
  return [value, setValueNoUndefined]
}
