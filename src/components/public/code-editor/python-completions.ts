/**
 * Python language server for client-side code intelligence
 * Provides autocomplete, hover info, and basic type inference
 */

import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'

// Python keywords
export const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield'
]

// Python built-in functions with type hints
export const PYTHON_BUILTINS = [
  { label: 'print', type: 'function', info: 'print(*objects, sep=\' \', end=\'\\n\', file=sys.stdout, flush=False)' },
  { label: 'input', type: 'function', info: 'input(prompt=\'\') -> str' },
  { label: 'len', type: 'function', info: 'len(obj) -> int' },
  { label: 'range', type: 'function', info: 'range(stop) or range(start, stop[, step])' },
  { label: 'str', type: 'function', info: 'str(object) -> string' },
  { label: 'int', type: 'function', info: 'int(x, base=10) -> integer' },
  { label: 'float', type: 'function', info: 'float(x) -> float' },
  { label: 'bool', type: 'function', info: 'bool(x) -> bool' },
  { label: 'list', type: 'function', info: 'list() -> new empty list' },
  { label: 'dict', type: 'function', info: 'dict() -> new empty dictionary' },
  { label: 'set', type: 'function', info: 'set() -> new empty set object' },
  { label: 'tuple', type: 'function', info: 'tuple() -> empty tuple' },
  { label: 'abs', type: 'function', info: 'abs(x) -> absolute value' },
  { label: 'max', type: 'function', info: 'max(iterable, *[, default, key])' },
  { label: 'min', type: 'function', info: 'min(iterable, *[, default, key])' },
  { label: 'sum', type: 'function', info: 'sum(iterable, start=0)' },
  { label: 'sorted', type: 'function', info: 'sorted(iterable, *, key=None, reverse=False)' },
  { label: 'reversed', type: 'function', info: 'reversed(sequence)' },
  { label: 'enumerate', type: 'function', info: 'enumerate(iterable, start=0)' },
  { label: 'zip', type: 'function', info: 'zip(*iterables)' },
  { label: 'map', type: 'function', info: 'map(function, iterable, ...)' },
  { label: 'filter', type: 'function', info: 'filter(function, iterable)' },
  { label: 'all', type: 'function', info: 'all(iterable) -> bool' },
  { label: 'any', type: 'function', info: 'any(iterable) -> bool' },
  { label: 'isinstance', type: 'function', info: 'isinstance(obj, class_or_tuple) -> bool' },
  { label: 'type', type: 'function', info: 'type(object) -> type object' },
  { label: 'open', type: 'function', info: 'open(file, mode=\'r\', buffering=-1, encoding=None, ...)' },
  { label: 'round', type: 'function', info: 'round(number, ndigits=None)' },
  { label: 'ord', type: 'function', info: 'ord(c) -> integer' },
  { label: 'chr', type: 'function', info: 'chr(i) -> Unicode character' },
  { label: 'dir', type: 'function', info: 'dir([object]) -> list of strings' },
  { label: 'help', type: 'function', info: 'help([object])' },
  { label: 'getattr', type: 'function', info: 'getattr(object, name[, default])' },
  { label: 'setattr', type: 'function', info: 'setattr(object, name, value)' },
  { label: 'hasattr', type: 'function', info: 'hasattr(object, name) -> bool' },
]

// Turtle graphics methods
export const TURTLE_METHODS = [
  { label: 'forward', type: 'method', info: 'forward(distance) - Move forward by distance' },
  { label: 'backward', type: 'method', info: 'backward(distance) - Move backward by distance' },
  { label: 'right', type: 'method', info: 'right(angle) - Turn right by angle degrees' },
  { label: 'left', type: 'method', info: 'left(angle) - Turn left by angle degrees' },
  { label: 'penup', type: 'method', info: 'penup() - Pull the pen up' },
  { label: 'pendown', type: 'method', info: 'pendown() - Pull the pen down' },
  { label: 'pensize', type: 'method', info: 'pensize(width) - Set pen width' },
  { label: 'pencolor', type: 'method', info: 'pencolor(color) - Set pen color' },
  { label: 'fillcolor', type: 'method', info: 'fillcolor(color) - Set fill color' },
  { label: 'color', type: 'method', info: 'color(pencolor, fillcolor) - Set colors' },
  { label: 'begin_fill', type: 'method', info: 'begin_fill() - Begin filling' },
  { label: 'end_fill', type: 'method', info: 'end_fill() - End filling' },
  { label: 'circle', type: 'method', info: 'circle(radius, extent=None, steps=None)' },
  { label: 'goto', type: 'method', info: 'goto(x, y) - Move to position' },
  { label: 'setx', type: 'method', info: 'setx(x) - Set x coordinate' },
  { label: 'sety', type: 'method', info: 'sety(y) - Set y coordinate' },
  { label: 'setheading', type: 'method', info: 'setheading(angle) - Set heading angle' },
  { label: 'home', type: 'method', info: 'home() - Move to origin (0, 0)' },
  { label: 'clear', type: 'method', info: 'clear() - Clear drawings' },
  { label: 'reset', type: 'method', info: 'reset() - Reset turtle state' },
  { label: 'speed', type: 'method', info: 'speed(speed) - Set animation speed (0-10)' },
  { label: 'position', type: 'method', info: 'position() -> (x, y) tuple' },
  { label: 'heading', type: 'method', info: 'heading() -> current heading angle' },
  { label: 'dot', type: 'method', info: 'dot(size=None, color=None)' },
  { label: 'stamp', type: 'method', info: 'stamp() -> stamp_id' },
  { label: 'write', type: 'method', info: 'write(arg, move=False, align=\'left\', font=(...))' },
]

// Common Python modules and their members
export const PYTHON_MODULES: Record<string, Array<{ label: string, type: string, info: string }>> = {
  'turtle': TURTLE_METHODS,
  'math': [
    { label: 'pi', type: 'constant', info: 'π = 3.141592...' },
    { label: 'e', type: 'constant', info: 'e = 2.718281...' },
    { label: 'sqrt', type: 'function', info: 'sqrt(x) - Square root' },
    { label: 'sin', type: 'function', info: 'sin(x) - Sine of x (in radians)' },
    { label: 'cos', type: 'function', info: 'cos(x) - Cosine of x (in radians)' },
    { label: 'tan', type: 'function', info: 'tan(x) - Tangent of x (in radians)' },
    { label: 'radians', type: 'function', info: 'radians(degrees) - Convert degrees to radians' },
    { label: 'degrees', type: 'function', info: 'degrees(radians) - Convert radians to degrees' },
    { label: 'pow', type: 'function', info: 'pow(x, y) - x raised to power y' },
    { label: 'floor', type: 'function', info: 'floor(x) - Floor of x' },
    { label: 'ceil', type: 'function', info: 'ceil(x) - Ceiling of x' },
  ],
  'random': [
    { label: 'random', type: 'function', info: 'random() -> random float in [0.0, 1.0)' },
    { label: 'randint', type: 'function', info: 'randint(a, b) -> random integer in [a, b]' },
    { label: 'choice', type: 'function', info: 'choice(seq) -> random element from sequence' },
    { label: 'shuffle', type: 'function', info: 'shuffle(x) -> shuffle list x in place' },
    { label: 'uniform', type: 'function', info: 'uniform(a, b) -> random float in [a, b]' },
  ]
}

/**
 * Extract user-defined variables, functions, and classes from code
 */
function extractUserDefinitions(code: string): Array<{ label: string, type: string, info: string }> {
  const definitions: Array<{ label: string, type: string, info: string }> = []

  // Match function definitions: def func_name(args):
  const funcRegex = /def\s+(\w+)\s*\((.*?)\)/g
  let match
  while ((match = funcRegex.exec(code)) !== null) {
    definitions.push({
      label: match[1],
      type: 'function',
      info: `def ${match[1]}(${match[2]})`
    })
  }

  // Match class definitions: class ClassName:
  const classRegex = /class\s+(\w+)(?:\s*\(.*?\))?\s*:/g
  while ((match = classRegex.exec(code)) !== null) {
    definitions.push({
      label: match[1],
      type: 'class',
      info: `class ${match[1]}`
    })
  }

  // Match variable assignments (simple heuristic)
  const varRegex = /^(\w+)\s*=/gm
  while ((match = varRegex.exec(code)) !== null) {
    const name = match[1]
    // Skip if it's a keyword or already defined as function/class
    if (!PYTHON_KEYWORDS.includes(name) && !definitions.some(d => d.label === name)) {
      definitions.push({
        label: name,
        type: 'variable',
        info: `variable: ${name}`
      })
    }
  }

  return definitions
}

/**
 * Main completion function for Python
 */
export function pythonCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/)
  const code = context.state.doc.toString()
  const beforeCursor = code.slice(0, context.pos)

  // Check if we just typed a dot (for attribute access)
  const afterDot = beforeCursor.match(/(\w+)\.$/)

  // Show completions if:
  // 1. We have a word to complete
  // 2. User explicitly requested (Ctrl+Space)
  // 3. We just typed a dot for attribute access
  if (!word && !afterDot) {
    return null
  }

  if (word && word.from === word.to && !context.explicit && !afterDot) {
    return null
  }

  // Check if we're after a dot (attribute access)
  const dotMatch = beforeCursor.match(/(\w+)\.(\w*)$/)
  if (dotMatch) {
    const objectName = dotMatch[1]
    const partialAttr = dotMatch[2]

    // Determine the correct starting position for completions
    // If there's partial text after the dot, use word.from, otherwise use current position
    const from = word && word.from !== word.to ? word.from : context.pos

    // Check if it's a known module
    if (PYTHON_MODULES[objectName]) {
      return {
        from,
        options: PYTHON_MODULES[objectName].map(item => ({
          label: item.label,
          type: item.type,
          detail: item.info
        }))
      }
    }

    // For turtle objects, provide turtle methods
    // Simple heuristic: if variable contains 'turtle' or 't' after 'import turtle'
    if (code.includes('import turtle') && (objectName.toLowerCase().includes('turtle') || objectName === 't')) {
      return {
        from,
        options: TURTLE_METHODS.map(item => ({
          label: item.label,
          type: item.type,
          detail: item.info
        }))
      }
    }

    // Return common object methods for strings, lists, etc.
    return null
  }

  // Check if we're after 'import'
  if (beforeCursor.match(/import\s+\w*$/)) {
    return {
      from: word?.from ?? context.pos,
      options: Object.keys(PYTHON_MODULES).map(mod => ({
        label: mod,
        type: 'module',
        detail: `module: ${mod}`
      }))
    }
  }

  // Get user-defined symbols
  const userDefs = extractUserDefinitions(code)

  // Combine all completions
  const allCompletions = [
    ...PYTHON_KEYWORDS.map(kw => ({ label: kw, type: 'keyword' })),
    ...PYTHON_BUILTINS.map(b => ({ label: b.label, type: b.type, detail: b.info })),
    ...userDefs.map(d => ({ label: d.label, type: d.type, detail: d.info }))
  ]

  return {
    from: word?.from ?? context.pos,
    options: allCompletions
  }
}
