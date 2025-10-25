"use client"

import * as React from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function ChatInput({
  onSend,
  placeholder = "Type your message...",
  disabled = false,
  className,
  maxLength = 1000,
  ...props
}) {
  const [message, setMessage] = React.useState("")
  const textareaRef = React.useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = (e) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
    }
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [message])

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        "flex items-end gap-2 p-4 border-t bg-background",
        className
      )}
      {...props}
    >
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-h-[2.5rem] max-h-[150px] resize-none pr-12 py-3",
            "focus-visible:ring-1 focus-visible:ring-ring"
          )}
          style={{ height: "auto" }}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {message.length}/{maxLength}
        </div>
      </div>
      
      <Button
        type="submit"
        size="sm"
        disabled={!message.trim() || disabled}
        className="shrink-0 h-10 w-10 p-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}

// Alternative compact version for inline use
export function ChatInputInline({
  onSend,
  placeholder = "Type your message...",
  disabled = false,
  className,
  ...props
}) {
  const [message, setMessage] = React.useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        "flex items-center gap-2 w-full",
        className
      )}
      {...props}
    >
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-h-[2.5rem] max-h-[100px] resize-none"
        rows={1}
      />
      
      <Button
        type="submit"
        size="sm"
        disabled={!message.trim() || disabled}
        className="shrink-0 h-10 w-10 p-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}

export default ChatInput