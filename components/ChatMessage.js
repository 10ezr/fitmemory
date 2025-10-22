import clsx from "clsx";
import { motion } from "framer-motion";
import Image from "next/image";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  // Parse message content for rich formatting
  const parseContent = (content) => {
    if (typeof content !== "string") return content;

    // Split by lines to handle lists and formatting
    const lines = content.split("\n");

    return lines.map((line, index) => {
      // Handle bullet points
      if (line.trim().match(/^[•\-\*]\s/)) {
        return (
          <li key={index} className="ml-4 mb-1">
            {formatInlineText(line.replace(/^[•\-\*]\s/, ""))}
          </li>
        );
      }

      // Handle numbered lists
      if (line.trim().match(/^\d+\.\s/)) {
        return (
          <li key={index} className="ml-4 mb-1 list-decimal">
            {formatInlineText(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }

      // Handle headers (## or #)
      if (line.trim().match(/^#{1,2}\s/)) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s/, "");
        return (
          <div
            key={index}
            className={clsx(
              "font-bold mb-2 mt-3",
              level === 1 ? "text-lg" : "text-base"
            )}
          >
            {formatInlineText(text)}
          </div>
        );
      }

      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 last:mb-0">
            {formatInlineText(line)}
          </p>
        );
      }

      return <br key={index} />;
    });
  };

  // Format inline text with bold, italic, code
  const formatInlineText = (text) => {
    if (typeof text !== "string") return text;

    // Handle bold text **text**
    text = text.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-bold">$1</strong>'
    );

    // Handle italic text *text*
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Handle code `text`
    text = text.replace(
      /`([^`]+)`/g,
      '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>'
    );

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className="max-w-3xl">
        <div
          className={clsx(
            "flex flex-col",
            isUser ? "items-end" : "items-start"
          )}
        >
          {/* Avatar for assistant
          {isAssistant && (
            <div className="flex items-start gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                💪
              </div>
            </div>
          )} */}
          {/* Message bubble */}
          <div
            className={clsx(
              "message-bubble shadow-sm border-2 transition-all duration-200",
              isUser &&
                "bg-primary text-primary-foreground border-primary/20 shadow-primary/10",
              isAssistant &&
                "bg-neutral-900 border-border/50 hover:border-border shadow-lg",
              isSystem &&
                "bg-muted/50 text-muted-foreground text-center italic border-muted"
            )}
          >
            <div
              className={clsx(
                "text-[14px] leading-relaxed",
                isAssistant && "prose prose-sm max-w-none"
              )}
            >
              {parseContent(message.content)}
            </div>

            {/* Exercise images */}
            {message.exerciseImages && message.exerciseImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.exerciseImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border"
                  >
                    <Image
                      src={image.url}
                      alt={image.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Workout logged indicator */}
            {message.workoutLogged && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 p-3 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
              >
                <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Workout logged successfully
                </p>
                {message.workout && (
                  <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                    {message.workout.name || "Workout"} •{" "}
                    {message.workout.exercises} exercises
                  </p>
                )}
              </motion.div>
            )}
          </div>
          {/* Timestamp */}
          <div className="text-xs text-muted-foreground mt-2 px-1 flex items-center gap-1">
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isAssistant && (
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
