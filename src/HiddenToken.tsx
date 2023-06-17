import * as React from 'react'

interface THiddenTokenProps {
  token: string
}

const HiddenToken: React.FC<THiddenTokenProps> = (props) => {
  const { token } = props
  const head = token.substring(0, 3)
  const tail = token.substring(token.length - 3)

  return (
    <>
      {head}...{tail}
    </>
  )
}

export default HiddenToken
