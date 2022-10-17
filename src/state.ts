import { createStateContext } from 'react-use'

export interface TSharedState {
  loading: boolean
  messageJson?: string
  token?: string
  device_id?: number
  plugin_id?: number
  plugin_code?: string
}

const defaultMessage = `{
    "attr": "3132330A",
    "arr": [
        1,
        2,
        3
    ]
}`

export const [useSharedState, SharedStateProvider] = createStateContext<TSharedState>({
  loading: false,
  messageJson: localStorage.getItem('input-message') || defaultMessage,
})
