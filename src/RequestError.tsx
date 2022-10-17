import * as React from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

interface TRequestErrorProps {
  error: string
  title?: string
  setError: (error: string) => void
}

const RequestError: React.FC<TRequestErrorProps> = (props) => {
  const { error, title, setError } = props

  const handleCloseError = () => {
    setError('')
  }

  return (
    <>
      {error && (
        <Dialog open={true} onClose={handleCloseError} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
          <DialogTitle id="alert-dialog-title">{title || 'Request error'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">{error}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseError} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

export default RequestError
