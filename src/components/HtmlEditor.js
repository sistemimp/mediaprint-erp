import React, { useCallback, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { CButton, CButtonGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBold, cilItalic, cilUnderline, cilList, cilListNumbered, cilLink } from '@coreui/icons'

const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta']
const allowedTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'div',
  'span',
  'ul',
  'ol',
  'li',
  'br',
  'a',
])

const sanitizeHtml = (htmlValue) => {
  if (!htmlValue) return ''
  if (typeof document === 'undefined') return htmlValue
  const container = document.createElement('div')
  container.innerHTML = htmlValue
  if (blockedTags.length > 0) {
    container.querySelectorAll(blockedTags.join(',')).forEach((el) => el.remove())
  }

  const unwrapElement = (element) => {
    const parent = element.parentNode
    if (!parent) {
      element.remove()
      return
    }
    const fragment = document.createDocumentFragment()
    while (element.firstChild) {
      fragment.appendChild(element.firstChild)
    }
    parent.replaceChild(fragment, element)
  }

  const sanitizeNode = (node) => {
    Array.from(node.children).forEach((child) => {
      const tagName = child.tagName ? child.tagName.toLowerCase() : ''
      if (!allowedTags.has(tagName) && tagName !== '') {
        unwrapElement(child)
        return
      }

      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name)
          return
        }
        if (tagName !== 'a') {
          child.removeAttribute(attr.name)
          return
        }
        if (!['href', 'target', 'rel'].includes(name)) {
          child.removeAttribute(attr.name)
          return
        }
        if (name === 'href') {
          const href = child.getAttribute('href') || ''
          if (/^javascript:/i.test(href)) {
            child.removeAttribute('href')
          } else if (href && !/^(https?:|mailto:|tel:)/i.test(href)) {
            child.setAttribute('href', `https://${href.replace(/^\/+/, '')}`)
          }
        }
      })

      if (tagName === 'a') {
        if (!child.getAttribute('target')) {
          child.setAttribute('target', '_blank')
        }
        child.setAttribute('rel', 'noreferrer noopener')
      }

      sanitizeNode(child)
    })
  }

  sanitizeNode(container)

  const textCheck = container.textContent ? container.textContent.trim() : ''
  if (!textCheck) {
    return ''
  }
  return container.innerHTML.trim()
}

const HtmlEditor = ({ value, onChange, disabled, placeholder, minHeight, className }) => {
  const editorRef = useRef(null)
  const lastHtml = useRef('')

  const syncValue = useCallback(
    (nextValue) => {
      const editor = editorRef.current
      if (!editor) return
      const normalized = sanitizeHtml(nextValue || '')
      if (normalized === lastHtml.current && normalized === editor.innerHTML) return
      lastHtml.current = normalized
      editor.innerHTML = normalized
    },
    [],
  )

  useEffect(() => {
    syncValue(value || '')
  }, [value, syncValue])

  const emitChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor || typeof onChange !== 'function') return
    const sanitized = sanitizeHtml(editor.innerHTML)
    if (sanitized !== editor.innerHTML) {
      editor.innerHTML = sanitized
    }
    if (sanitized === lastHtml.current) return
    lastHtml.current = sanitized
    onChange(sanitized)
  }, [onChange])

  const applyCommand = useCallback(
    (command, commandValue = null) => {
      if (disabled || typeof document === 'undefined' || typeof document.execCommand !== 'function') return
      const editor = editorRef.current
      if (!editor) return
      editor.focus()
      document.execCommand(command, false, commandValue)
      emitChange()
    },
    [disabled, emitChange],
  )

  const handleInsertLink = useCallback(() => {
    if (disabled || typeof window === 'undefined') return
    let url = window.prompt('Inserisci URL del link', 'https://') || ''
    url = url.trim()
    if (!url) return
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      url = `https://${url.replace(/^\/+/, '')}`
    }
    applyCommand('createLink', url)
  }, [disabled, applyCommand])

  const handlePaste = useCallback(
    (event) => {
      if (disabled) return
      event.preventDefault()
      const clipboard = event.clipboardData
      const html = clipboard?.getData('text/html')
      const text = clipboard?.getData('text/plain')
      const payload = html && html.trim() !== '' ? html : text
      if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return
      const safe = sanitizeHtml(payload || text || '')
      document.execCommand('insertHTML', false, safe || '')
      emitChange()
    },
    [disabled, emitChange],
  )

  const handleInput = useCallback(() => {
    if (disabled) return
    emitChange()
  }, [disabled, emitChange])

  return (
    <div className={classNames('html-editor', className)} data-disabled={disabled}>
      <div className="html-editor__toolbar">
        <CButtonGroup role="group" size="sm">
          <CButton type="button" color="secondary" variant="ghost" disabled={disabled} title="Grassetto" onClick={() => applyCommand('bold')}>
            <CIcon icon={cilBold} />
          </CButton>
          <CButton type="button" color="secondary" variant="ghost" disabled={disabled} title="Corsivo" onClick={() => applyCommand('italic')}>
            <CIcon icon={cilItalic} />
          </CButton>
          <CButton type="button" color="secondary" variant="ghost" disabled={disabled} title="Sottolineato" onClick={() => applyCommand('underline')}>
            <CIcon icon={cilUnderline} />
          </CButton>
          <CButton
            type="button"
            color="secondary"
            variant="ghost"
            disabled={disabled}
            title="Elenco puntato"
            onClick={() => applyCommand('insertUnorderedList')}
          >
            <CIcon icon={cilList} />
          </CButton>
          <CButton
            type="button"
            color="secondary"
            variant="ghost"
            disabled={disabled}
            title="Elenco numerato"
            onClick={() => applyCommand('insertOrderedList')}
          >
            <CIcon icon={cilListNumbered} />
          </CButton>
          <CButton type="button" color="secondary" variant="ghost" disabled={disabled} title="Inserisci link" onClick={handleInsertLink}>
            <CIcon icon={cilLink} />
          </CButton>
        </CButtonGroup>
      </div>
      <div
        ref={editorRef}
        className="html-editor__input"
        contentEditable={!disabled}
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={emitChange}
        onPaste={handlePaste}
        style={{ minHeight }}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        tabIndex={disabled ? -1 : 0}
      />
    </div>
  )
}

HtmlEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  minHeight: PropTypes.number,
  className: PropTypes.string,
}

HtmlEditor.defaultProps = {
  value: '',
  onChange: () => { },
  disabled: false,
  placeholder: '',
  minHeight: 220,
  className: undefined,
}

export default HtmlEditor

