"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: number | null
  onValueChange: (value: number | null) => void
  currencySymbol?: string
  symbolClassName?: string
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, currencySymbol, symbolClassName, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")
    const internalRef = React.useRef<HTMLInputElement | null>(null)

    // Merged ref for internal and external use
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    // Update display value when the numeric value changes from outside
    React.useEffect(() => {
      const numericDisplayValue = parseFloat(displayValue.replace(/,/g, ""))
      const currentValue = Number.isNaN(numericDisplayValue) ? null : numericDisplayValue
      if (currentValue !== value) {
        const formatted = value === null ? "" : value.toLocaleString("en-US")
        setDisplayValue(formatted)
      }
    }, [value, displayValue])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target
      const cursorPosition = input.selectionStart || 0
      const oldValue = input.value
      
      // Extract digits only
      const rawValue = oldValue.replace(/[^0-9]/g, "")
      
      if (rawValue === "") {
        setDisplayValue("")
        onValueChange(null)
        return
      }

      const numericValue = parseInt(rawValue, 10)
      if (isNaN(numericValue)) return

      const formatted = numericValue.toLocaleString("en-US")
      
      // Calculate how many digits were before the cursor
      const digitsBeforeCursor = oldValue.substring(0, cursorPosition).replace(/[^0-9]/g, "").length
      
      setDisplayValue(formatted)
      onValueChange(numericValue)

      // Restore cursor position after render
      requestAnimationFrame(() => {
        if (!input) return
        
        let newCursorPos = 0
        let digitsCount = 0
        
        for (let i = 0; i < formatted.length; i++) {
          if (/[0-9]/.test(formatted[i])) {
            digitsCount++
          }
          newCursorPos = i + 1
          if (digitsCount === digitsBeforeCursor) {
            break
          }
        }
        
        input.setSelectionRange(newCursorPos, newCursorPos)
      })
    }

    return (
      <div className="relative w-full group/money-input">
        {currencySymbol && (
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold select-none pointer-events-none transition-colors group-focus-within/money-input:text-foreground",
            symbolClassName
          )}>
            {currencySymbol}
          </span>
        )}
        <Input
          {...props}
          ref={setRefs}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          className={cn(
            currencySymbol && "pl-7",
            "font-bold tabular-nums",
            className
          )}
        />
      </div>
    )
  }
)

MoneyInput.displayName = "MoneyInput"

export { MoneyInput }
