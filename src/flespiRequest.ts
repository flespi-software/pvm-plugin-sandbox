import { TSharedState } from './state'

const flespiUrl = 'https://flespi.io'

export const flespiPOST = async (sharedState: TSharedState, url: string, data: any): Promise<any> => {
  const resp = await fetch(`${flespiUrl}${url}`, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `FlespiToken ${sharedState.token}`,
    },
    body: data !== null ? JSON.stringify(data) : '',
  })
  if (resp.status !== 200) {
    const body = await resp.text()
    throw new Error(`POST ${url} failed with status ${resp.status}: ${body}`, { cause: body })
  }
  return await resp.json()
}

export const flespiGET = async (sharedState: TSharedState, url: string): Promise<any> => {
  const resp = await fetch(`${flespiUrl}${url}`, {
    method: 'GET',
    cache: 'no-cache',
    headers: {
      Authorization: `FlespiToken ${sharedState.token}`,
    },
  })
  if (resp.status !== 200) {
    const body = await resp.text()
    throw new Error(`GET ${url} failed with status ${resp.status}: ${body}`, { cause: body })
  }
  return await resp.json()
}

export const flespiPUT = async (sharedState: TSharedState, url: string, data: any): Promise<any> => {
  const resp = await fetch(`${flespiUrl}${url}`, {
    method: 'PUT',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `FlespiToken ${sharedState.token}`,
    },
    body: data !== null ? JSON.stringify(data) : '',
  })
  if (resp.status !== 200) {
    const body = await resp.text()
    throw new Error(`PUT ${url} failed with status ${resp.status}: ${body}`, { cause: body })
  }
  return await resp.json()
}
