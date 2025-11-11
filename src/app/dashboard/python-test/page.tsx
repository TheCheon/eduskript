import { CodeEditor } from '@/components/public/code-editor'

const turtleExample = `import turtle

# Create a turtle
t = turtle.Turtle()

# Draw a square
for i in range(4):
    t.forward(100)
    t.right(90)

print("Square drawn!")
`

export default function PythonTestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Python Editor Test</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Example 1: Turtle Graphics</h2>
          <CodeEditor
            id="turtle-example"
            language="python"
            initialCode={turtleExample}
            showCanvas={true}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Example 2: Simple Python</h2>
          <CodeEditor
            id="simple-example"
            language="python"
            initialCode={`# Simple Python example
for i in range(10):
    print(f"Count: {i}")

print("Done!")
`}
            showCanvas={false}
          />
        </section>
      </div>
    </div>
  )
}
