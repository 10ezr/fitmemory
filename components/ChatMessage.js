import { motion } from "framer-motion"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function ChatMessage({ message }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const isAssistant = message.role === "assistant"

  // Parse message content for rich formatting
  const parseContent = (content) => {
    if (typeof content !== "string") return content
    const lines = content.split("\n")
    return lines.map((line, index) => {
      if (line.trim().match(/^[•\-\*]\s/)) {
        return (
          <li key={index} className="ml-4 mb-1">
            {formatInlineText(line.replace(/^[•\-\*]\s/, ""))}
          </li>
        )
      }
      if (line.trim().match(/^\d+\.\s/)) {
        return (
          <li key={index} className="ml-4 mb-1 list-decimal">
            {formatInlineText(line.replace(/^\d+\.\s/, ""))}
          </li>
        )
      }
      if (line.trim().match(/^#{1,2}\s/)) {
        const level = line.match(/^#+/)[0].length
        const text = line.replace(/^#+\s/, "")
        return (
          <div key={index} className={cn("font-bold mb-2 mt-3", level === 1 ? "text-lg" : "text-base")}>{formatInlineText(text)}</div>
        )
      }
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 last:mb-0">
            {formatInlineText(line)}
          </p>
        )
      }
      return <br key={index} />
    })
  }

  // Format inline text with bold, italic, code
  const formatInlineText = (text) => {
    if (typeof text !== "string") return text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    text = text.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={cn("flex", isUser ? "justify-end" : "justify-start")}> 
      <div className="max-w-3xl">
        <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}> 
          {/* Message card only, no avatar or AI badge */}
          <Card className={cn("transition-all duration-200", isUser && "bg-primary text-primary-foreground border-primary/20", isAssistant && "bg-card border-border/50 hover:border-border", isSystem && "bg-muted/50 text-muted-foreground border-muted")}> 
            <CardContent className={cn("p-4", isSystem && "text-center italic")}> 
              <div className={cn("text-sm leading-relaxed", isAssistant && "prose prose-sm max-w-none dark:prose-invert")}> 
                {parseContent(message.content)}
              </div>

              {message.exerciseImages && message.exerciseImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.exerciseImages.map((image, index) => (
                    <Card key={index} className="w-20 h-20 overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image src={image.url} alt={image.name} fill className="object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">{image.name}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamp (kept minimal) */}
          <div className="text-xs text-muted-foreground mt-2 px-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
