import { createServer } from "http"
import { readFile, readdir } from "fs/promises"
import sanitizeFilename from "sanitize-filename"
import ReactMarkdown from "react-markdown"

import { getPostData, manageComments, readComments, getFormattedTimestamp } from "./utils.js"

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    
    if (req.method === "POST") {
      await apiHandler(req, url)
    }
    
    await sendJSX(res, <Router url={url} />)
  } catch (err) {
    console.error(err)
    res.statusCode = err.statusCode ?? 500
    res.end()
  }
}).listen(8081)


async function apiHandler(req, url) {
  let reqBody = {}
  reqBody = await getPostData(req);
  // TODO
  console.log("which post?: ", reqBody)

  const commentData = { ...reqBody, timestamp: new Date().toISOString() };
  await manageComments(url.pathname, commentData)

  return;
}


function Router({ url }) {
  let page
  if (url.pathname === "/") {
    page = <BlogIndexPage />
  } else {
    const postSlug = sanitizeFilename(url.pathname.slice(1))
    page = <BlogPostPage postSlug={postSlug} />
  }
  return <BlogLayout>{page}</BlogLayout>
}

async function BlogIndexPage() {
  const postFiles = await readdir("./posts")
  const postSlugs = postFiles.map((file) =>
    file.slice(0, file.lastIndexOf("."))
  )
  return (
    <>
      <h1>Welcome to my blog</h1>
      <div>
        {postSlugs.map((slug) => (
          <Post key={slug} slug={slug} />
        ))}
      </div>
    </>
  )
}

function BlogPostPage({ postSlug }) {
  return (
    <>
      <Post slug={postSlug} />
      <CommentForm slug={postSlug} />
      <CommentList slug={postSlug} />
    </>
  )
}

function CommentForm({ slug }) {
  return (
    <form action={`/${slug}`} method="post">
      <label htmlFor="user">User:</label>
      <input type="text" id="user" name="user" required />
      <br />

      <label htmlFor="comment">Comment:</label><br />
      <textarea id="comment" name="comment" rows="4" cols="50" required></textarea><br />

      <input type="submit" value="Submit" />
    </form>
  )
}

async function CommentList({ slug }) {
  const comments = await readComments(slug)

  
  return (
    <div>
      {comments.map((comm, i) => {

        console.log("comment: ", comm)

        return (
          <p key={comm.timestamp + i} style={{ marginTop: 40 }}>
            <b>{comm.user}</b>
            <span>: {(getFormattedTimestamp(comm.timestamp))} </span>
            <p>{comm.comment}</p>
          </p>
        )
      })}
    </div>
  )
}


async function Post({ slug }) {
  let content
  try {
    content = await readFile("./posts/" + slug + ".md", "utf8")
  } catch (err) {
    throwNotFound(err)
  }
  return (
    <>
      <h2>
        <a href={"/" + slug}>{slug}</a>
      </h2>
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </>
  )
}

function BlogLayout({ children }) {
  const author = "Jae Doe"
  return (
    <html>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
          <input />
          <hr />
        </nav>
        <main>{children}</main>
        <Footer author={author} />
      </body>
    </html>
  )
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>
          (c) {author} {new Date().getFullYear()}
        </i>
      </p>
    </footer>
  )
}

async function sendJSX(res, jsx) {
  const clientJSX = await renderJSXToClientJSX(jsx)
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX)
  res.setHeader("Content-Type", "application/json")
  res.end(clientJSXString)
}

function throwNotFound(cause) {
  const notFound = new Error("Not found.", { cause })
  notFound.statusCode = 404
  throw notFound
}

function stringifyJSX(key, value) {
  if (value === Symbol.for("react.element")) {
    return "$RE"
  } else if (typeof value === "string" && value.startsWith("$")) {
    return "$" + value
  } else {
    return value
  }
}

async function renderJSXToClientJSX(jsx) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
    jsx == null
  ) {
    return jsx
  } else if (Array.isArray(jsx)) {
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)))
  } else if (jsx != null && typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      // if (jsx.type === Symbol.for("react.fragment")) {
      //   const { children } = jsx.props
      //   return await renderJSXToClientJSX(children)
      // } 

      if (jsx.type === Symbol.for("react.fragment")) {
        const { children } = jsx.props
        return await renderJSXToClientJSX(children)
      } else if (typeof jsx.type === "string") {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        }
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type
        const props = jsx.props
        const returnedJsx = await Component(props)
        return renderJSXToClientJSX(returnedJsx)
      } else {
        console.log(jsx)
        throw new Error("Not implemented.")
      }
    } else {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await renderJSXToClientJSX(value),
          ])
        )
      )
    }
  } else {
    console.log(jsx)
    throw new Error("Not implemented")
  }
}