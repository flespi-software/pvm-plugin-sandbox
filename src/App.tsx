import * as React from 'react'
import { Backdrop, Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel, Grid, Stack, TextField, Typography } from '@mui/material'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useSharedState } from './state'
import TokenSelector from './TokenSelector'
import DeviceSelector from './DeviceSelector'
import PluginSelector from './PluginSelector'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { Monaco } from '@monaco-editor/react'
import { flespiPOST, flespiPUT } from './flespiRequest'
import RequestError from './RequestError'
import { connect, MqttClient } from 'mqtt/dist/mqtt'
import { useLocalStorageString } from './useLocalStorageString'

const idsSelectorHeight = 30
const codeButtonsHeight = 37
const msgHeaderHeight = 37

const mqttUrl = 'wss://mqtt.flespi.io'

const validateJson = (value: string): string | null => {
  let error = null,
    parsed
  try {
    parsed = JSON.parse(value)
  } catch (e) {
    error = 'Not a valid json: ' + e
  }
  if (!error) {
    if (typeof parsed !== 'object' || Array.isArray(parsed)) error = 'expecting json object'
  }
  return error
}

const systemFields = ['ident', 'device.id', 'device.name', 'device.type.id', 'rest.timestamp']

const hideSystemFiles = (value: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {}
  for (const name in value) {
    if (!systemFields.includes(name)) result[name] = value[name]
  }
  return result
}

type TAction = '' | 'save' | 'test' | 'pretty'

export default function App() {
  const [sharedState, setSharedState] = useSharedState()
  console.log('sharedState', sharedState)
  const [reqError, setReqError] = useState('')
  const [decorations, setDecorations] = useState<string[]>([])
  const saved = useRef({ saved: false })
  const mqttCl = useRef<MqttClient>()
  const [_, setMsgJsonInput] = useLocalStorageString('input-message', '')
  const [msgJsonValidationError, setMsgJsonValidationError] = useState<string | null>(null)
  const [msgProcessed, setMsgProcessed] = useState('')
  const [msgProcessedError, setMsgProcessedError] = useState(false)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()
  const [pluginLogMsg, setPluginLogMsg] = useState<Record<string, any> | null>(null)
  const [deviceMsg, setDeviceMsg] = useState<Record<string, any> | null>()
  const [displayedMsg, setDisplayedMsg] = useState<Record<string, any> | null>()
  const [action, setAction] = useState<TAction>('')

  const showErrorInCode = (ed: monaco.editor.IStandaloneCodeEditor, line: number, col: number, errMsg: string) => {
    ed.revealPositionInCenter({ lineNumber: line, column: col })
    ed.setPosition({ lineNumber: line, column: col })
    const ids = ed.deltaDecorations(decorations, [
      {
        range: new monaco.Range(line, col, line, col),
        options: {
          isWholeLine: true,
          className: 'errorLine',
        },
      },
    ])
    setDecorations(ids)
    setMsgProcessed(errMsg)
    setMsgProcessedError(true)
  }

  const clearErrorLine = () => {
    const ed = editorRef.current
    if (!ed) return
    const ids = ed.deltaDecorations(decorations, [])
    setDecorations(ids)
  }

  const Save = async (): Promise<boolean> => {
    const ed = editorRef.current
    if (!ed) return false
    clearErrorLine()
    if (saved.current.saved) return true
    setSharedState({ ...sharedState, loading: true })
    try {
      const resp = await flespiPUT(sharedState, `/gw/plugins/${sharedState.plugin_id}`, {
        configuration: { code: ed.getValue() },
      })
      console.log('resp', resp)
      setSharedState({ ...sharedState, loading: false, plugin_id: resp.result[0].id, plugin_code: resp.result[0].configuration.code })
      saved.current.saved = true
      return true
    } catch (e: any) {
      setSharedState({ ...sharedState, loading: false })
      let message = e.message
      if (/failed to validate configuration, plugin/.test(e.cause)) {
        const cause = JSON.parse(e.cause)
        // plugin.42.1024781:2:1: no json_object compile rule for awefawef (<class word_t>)
        const m = /plugin\.[^:]+:(\d+:\d+): (.+)$/.exec(cause.errors[0].reason)
        if (m) {
          const [_, codePos, errMsg] = m
          const [line, col] = codePos.split(':')
          showErrorInCode(ed, +line, +col, errMsg)
          message = errMsg
        }
      }
      setReqError(message)
      return false
    }
  }

  const Test = async () => {
    if (!editorRef.current) return false
    if (!sharedState.device_id) return setReqError('Please set device to test')
    if (!sharedState.messageJson) return setReqError('Please set input message to test')
    if (await Save()) {
      // now post the message
      try {
        setSharedState({ ...sharedState, loading: true })
        const resp = await flespiPOST(sharedState, `/gw/devices/${sharedState.device_id}/messages`, [JSON.parse(sharedState.messageJson)])
        console.log('test resp:', resp)
      } catch (e) {
        console.log('test error:', e)
        setReqError(`test error: ${e}`)
      } finally {
        setSharedState({ ...sharedState, loading: false })
      }
    }
  }

  const Pretty = () => {
    if (msgJsonValidationError || !sharedState.messageJson) return
    const value = JSON.parse(sharedState.messageJson)
    const strValue = JSON.stringify(value, null, 4)
    setMsgJsonInput(strValue)
    setSharedState({ ...sharedState, messageJson: strValue })
  }

  useEffect(() => {
    if (!action) return
    if (action) setAction('')
    if (action === 'save') Save()
    if (action === 'test') Test()
    if (action === 'pretty') Pretty()
  }, [action])

  const keyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      setAction('save')
    } else if (e.key === 'F9') {
      e.preventDefault()
      setAction('test')
    } else if (e.key === 'F2') {
      e.preventDefault()
      setAction('pretty')
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', keyDown, false)

    return () => {
      document.removeEventListener('keydown', keyDown, false)
    }
  })

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    monaco.languages.register({
      id: 'pvm',
    })
    monaco.languages.setLanguageConfiguration('pvm', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/'],
      },
    })
    monaco.languages.setMonarchTokensProvider('pvm', {
      ignoreCase: false,

      // C# style strings
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      keywords: [
        'pass',
        'repeat',
        'span',
        'split',
        'item',
        'items_count',
        'has_item',
        'unparsed',
        'foreach',
        'cmdresult',
        'cmdlock',
        'skip',
        'bits',
        'binary',
        'switch',
        'default',
        'if',
        'elif',
        'else',
        'block',
        'break',
        'continue',
        'return',
        'login',
        'store',
        'unset',
        'format',
        'map',
        'error',
        'keep',
        'is_set',
        'range',
        'match',
        'found',
        'compressed',
        'crc_of',
        'size_of',
        'reset',
        'strptime',
        'mktime',
        'delete',
        'merge_cancel',
        'invalid',
        'unsupported',
        'send',
        'any_of',
        'trim',
        'trimright',
        'trimleft',
        'strescape',
        'bitfield',
        'trace',
        'sleep',
        'cdn_check',
        'json',
        'json_array',
        'type_of',
        'current_command',
        'optional',
        'method',
        'uri',
        'body',
        'speed',
        'endian',
        'object',
        'array',
        'array_length',
        'send_command',
        'copy_input_to_message',
        'new_message',
        'timestamp',
        'move',
        'append',
        'bit',
        'of',
        'concat',
        'reverse',
      ],

      brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.bracket' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
      ],

      tokenizer: {
        root: [
          { include: '@whitespace' },
          { include: '@numbers' },
          { include: '@strings' },

          [/[,:;]/, 'delimiter'],
          [/[{}\[\]()]/, '@brackets'],

          [/\$[a-zA-Z]\w*/, 'variable.name'],
          [/\%[a-zA-Z][\w\.]*/, 'type'],
          [/\.[a-zA-Z]\w*/, 'attribute'],
          [/\#[a-zA-Z][\w\.]*/, 'tag'],
          [/\@[a-zA-Z][\w\.]*/, 'identifier'],

          [/(true|false|null)/, 'keyword'],

          [/\/\*/, 'comment', '@comment'],

          [
            /[a-zA-Z]\w*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier',
              },
            },
          ],
        ],

        // Deal with white space, including single and multi-line comments
        whitespace: [
          [/\s+/, 'white'],
          [/(^\/\/.*$)/, 'comment'],
        ],

        comment: [
          [/\*\//, 'comment', '@pop'],
          [/./, 'comment.content'],
        ],

        // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
        numbers: [
          [/-?0x([abcdef]|[ABCDEF]|\d)+/, 'number.hex'],
          [/[\-\+]?(\d*\.)?\d+/, 'number'],
          [/-?(nan|inf)/, 'number.nan'],
        ],

        // Recognize strings, including those broken across lines with \ (but not without)
        strings: [
          [/`/, 'string.fixed', '@fixedStringBody'],
          [/"/, 'string.escape', '@dblStringBody'],
        ],
        fixedStringBody: [
          [/[^\\`]+$/, 'string', '@popall'],
          [/[^\\`]+/, 'string'],
          [/`/, 'string.fixed', '@popall'],
        ],
        dblStringBody: [
          [/[^\\"]+$/, 'string', '@popall'],
          [/[^\\"]+/, 'string'],
          [/\\./, 'string'],
          [/"/, 'string.escape', '@popall'],
        ],
      },
    })

    editor.addAction({
      id: 'sandbox-save',
      label: 'Save',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => setAction('save'),
    })
    editor.addAction({
      id: 'sandbox-test',
      label: 'Test',
      keybindings: [monaco.KeyCode.F9],
      run: () => setAction('test'),
    })
    editor.addAction({
      id: 'sandbox-input-pretty',
      label: 'Pretty Input Message',
      keybindings: [monaco.KeyCode.F2],
      run: () => setAction('pretty'),
    })
    editor.getModel()?.updateOptions({ tabSize: 4, insertSpaces: false })
  }

  const handleEditorChange = () => {
    clearErrorLine()
    saved.current.saved = false
  }

  const btnPretty = () => {
    Pretty()
  }

  const msgJsonChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMsgJsonInput(value)
    setSharedState({ ...sharedState, messageJson: value })
    setMsgJsonValidationError(validateJson(value))
  }

  const hideSystemFieldsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSharedState({ ...sharedState, hide_system_fields: e.target.checked })
  }

  const btnSave = () => {
    setAction('save')
  }

  const btnTest = () => {
    setAction('test')
  }

  useEffect(() => {
    if (!sharedState.token) return
    const client = connect(mqttUrl, {
      username: sharedState.token,
      clean: true,
    })
    mqttCl.current = client
    client.on('connect', (connack) => {
      console.log('mqtt connect', connack)
    })
    client.on('error', (mqttError) => {
      console.log('mqtt error', mqttError)
      if (!/client disconnecting/.test(mqttError.message)) setReqError(`mqtt error: ${mqttError}`)
    })
    client.on('message', (topic, payload) => {
      const strPayload = payload.toString('utf-8')
      console.log('mqtt message', topic, strPayload)
      if (/^flespi\/log\/gw\/plugins\/\d+\/error$/.test(topic)) setPluginLogMsg(JSON.parse(strPayload))
      if (/^flespi\/message\/gw\/devices\/\d+$/.test(topic)) setDeviceMsg(JSON.parse(strPayload))
    })
    return () => {
      client.end()
      mqttCl.current = undefined
    }
  }, [sharedState.token])

  useEffect(() => {
    if (!sharedState.device_id || !mqttCl.current) return
    const topic = `flespi/message/gw/devices/${sharedState.device_id}`
    const cl = mqttCl.current
    cl.subscribe(topic, { qos: 1 })
    return () => {
      cl.unsubscribe(topic)
    }
  }, [sharedState.device_id])

  useEffect(() => {
    if (!pluginLogMsg) return
    // 0000bc [plugin.42.1024781:1:20] in ...
    const m = /plugin\.[^:]+:(\d+:\d+)/.exec(pluginLogMsg.reason)
    if (!m || !editorRef.current) {
      setMsgProcessed(pluginLogMsg.reason || JSON.stringify(pluginLogMsg))
      setMsgProcessedError(true)
    } else {
      const [_, codePos] = m
      const [line, col] = codePos.split(':')
      showErrorInCode(editorRef.current, +line, +col, pluginLogMsg.reason)
    }
  }, [pluginLogMsg])

  useEffect(() => {
    if (!deviceMsg) return
    if (sharedState.hide_system_fields) setDisplayedMsg(hideSystemFiles(deviceMsg))
    else setDisplayedMsg(deviceMsg)
  }, [deviceMsg, sharedState.hide_system_fields])

  useEffect(() => {
    if (!displayedMsg) return
    setMsgProcessed(JSON.stringify(displayedMsg, null, 4))
    setMsgProcessedError(false)
  }, [displayedMsg])

  useEffect(() => {
    if (!sharedState.plugin_id || !mqttCl.current) return
    const topic = `flespi/log/gw/plugins/${sharedState.plugin_id}/#`
    const cl = mqttCl.current
    cl.subscribe(topic, { qos: 1 })
    return () => {
      cl.unsubscribe(topic)
    }
  }, [sharedState.plugin_id])

  return (
    <Box sx={{ flexGrow: 1 }} style={{ height: '100vh' }}>
      <Grid container direction="column" style={{ minWidth: '1461px', height: '100vh' }} justifyContent="space-between">
        <Grid item>
          <Grid container>
            <Grid item xs={8} border="1px solid black" style={{ minWidth: '964px', height: '100vh', padding: '7px' }}>
              <Stack height={`${idsSelectorHeight}px`} direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={1}>
                <TokenSelector />
                {sharedState.token && <DeviceSelector />}
                {sharedState.device_id && <PluginSelector />}
              </Stack>
              {sharedState.plugin_code !== undefined ? (
                <>
                  <Editor
                    key="plugin-code"
                    height={`calc(100% - ${idsSelectorHeight}px - ${codeButtonsHeight}px)`}
                    language="pvm"
                    defaultValue={sharedState.plugin_code}
                    onMount={handleEditorDidMount}
                    onChange={handleEditorChange}
                  />
                  <Stack height={`${codeButtonsHeight}px`} direction="row-reverse" divider={<Divider orientation="vertical" flexItem />} spacing={1}>
                    <Button variant="contained" onClick={btnTest}>
                      Save & Test (F9)
                    </Button>
                    <Button variant="outlined" onClick={btnSave}>
                      Save (Ctrl+S)
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  <h1>What is that?</h1>
                  <Typography>
                    <a target="_blank" href="https://github.com/flespi-software/pvm-plugin-sandbox">
                      Source code
                    </a>
                  </Typography>
                  <Typography>
                    This is a tool to test a{' '}
                    <a target="_blank" href="https://flespi.com/kb/how-to-script-custom-parsing-logic-for-message-payload">
                      PVM plugin code
                    </a>{' '}
                    against an arbitrary JSON object{' '}
                    <a target="_blank" href="https://flespi.com/kb/messages-basic-information-units">
                      message
                    </a>
                    .
                  </Typography>
                  <Typography>
                    To do so, it requires your{' '}
                    <a target="_blank" href="https://flespi.com/kb/tokens-access-keys-to-flespi-platform">
                      flespi token
                    </a>
                    , to send requests to the flespi platform.
                  </Typography>
                  <Typography>Next, you will be asked for the Device ID and Plugin ID (you will be able to create them right here).</Typography>
                  <Typography>
                    In fact, that tool will just{' '}
                    <a target="_blank" href="https://flespi.io/gw/#/gw/devices/post_devices_dev_selector_messages">
                      post
                    </a>{' '}
                    your arbitrary JSON Object message into your device to pass it through the PVM plugin.
                  </Typography>
                  <Typography>Please enter and SET your flespi token in the input above.</Typography>
                  {sharedState.token && (
                    <>
                      <Typography>OK, now please enter the Device ID. You can create a new device right here if you want.</Typography>
                    </>
                  )}
                  {sharedState.device_id && (
                    <>
                      <Typography>OK, the last step, now please enter the Plugin ID. You can create a new one right here if you want.</Typography>
                      <Typography>Please note that the plugin will be assigned to the Device you specified.</Typography>
                    </>
                  )}
                </>
              )}
            </Grid>
            <Grid item xs={4} border="1px solid black">
              <Grid container direction="column" justifyContent="stretch">
                <Grid item style={{ height: `${msgHeaderHeight}px` }}>
                  <Grid container direction="row" justifyContent="space-between">
                    <Grid item>Message:</Grid>
                    <Grid item>
                      <Button variant="contained" onClick={btnPretty}>
                        Pretty (F2)
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item style={{ height: `calc(100% - ${msgHeaderHeight}px)` }}>
                  {/* <textarea id="message-json" style={{ width: '100%', height: `calc(100% - ${msgHeaderHeight}px)`, }}>msg</textarea> */}
                  <TextField
                    id="message-json"
                    key="message-json"
                    error={!!msgJsonValidationError}
                    label="Input message JSON Object"
                    multiline
                    minRows="17"
                    maxRows="17"
                    fullWidth
                    value={sharedState.messageJson}
                    onChange={msgJsonChange}
                  />
                  &nbsp;
                  <FormControlLabel
                    control={<Checkbox checked={sharedState.hide_system_fields} onChange={hideSystemFieldsChange} />}
                    label="Hide system fields"
                  />
                  &nbsp;
                  <TextField
                    id="output"
                    key="output"
                    label="Output"
                    multiline
                    minRows="18"
                    maxRows="18"
                    fullWidth
                    value={msgProcessed}
                    error={msgProcessedError}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={sharedState.loading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <RequestError error={reqError} title="App error" setError={setReqError} />
    </Box>
  )
}
