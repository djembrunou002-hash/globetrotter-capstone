import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComments, addComment, replyToComment, editComment, deleteComment } from '../services/commentService.js'
import { getUser } from '../services/tokenStorage.js'
import '../styles/CommentSection.css'

const EDIT_WINDOW_MS = 15 * 60 * 1000
const ROOT_PAGE_SIZE = 3
const REPLY_PAGE_SIZE = 3

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function countAllNodes(nodes) {
  return nodes.reduce((sum, node) => sum + 1 + countAllNodes(node.replies || []), 0)
}

function flattenDescendants(rootNode) {
  const result = []
  function walk(current) {
    for (const child of current.replies || []) {
      const replyingTo = current.id === rootNode.id ? null : { id: current.id, author: current.author }
      result.push({ ...child, replyingTo })
      walk(child)
    }
  }
  walk(rootNode)
  return result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

function mapNode(nodes, targetId, updater) {
  return nodes.map(node => {
    if (node.id === targetId) return updater(node)
    if (node.replies && node.replies.length) {
      return { ...node, replies: mapNode(node.replies, targetId, updater) }
    }
    return node
  })
}

function insertReplyRec(nodes, parentId, reply) {
  let didInsert = false
  const result = nodes.map(node => {
    if (didInsert) return node
    if (node.id === parentId) {
      didInsert = true
      return {
        ...node,
        reply_count: (node.reply_count || 0) + 1,
        replies: [...(node.replies || []), reply]
      }
    }
    if (node.replies && node.replies.length) {
      const [childReplies, childInserted] = insertReplyRec(node.replies, parentId, reply)
      if (childInserted) {
        didInsert = true
        return { ...node, reply_count: (node.reply_count || 0) + 1, replies: childReplies }
      }
    }
    return node
  })
  return [result, didInsert]
}

function insertReply(nodes, parentId, reply) {
  return insertReplyRec(nodes, parentId, reply)[0]
}

function removeNodeRec(nodes, targetId) {
  let didRemove = false
  const result = []
  for (const node of nodes) {
    if (didRemove) {
      result.push(node)
      continue
    }
    if (node.id === targetId) {
      didRemove = true
      result.push(...(node.replies || []))
      continue
    }
    if (node.replies && node.replies.length) {
      const [childReplies, childRemoved] = removeNodeRec(node.replies, targetId)
      if (childRemoved) {
        didRemove = true
        result.push({ ...node, reply_count: Math.max((node.reply_count || 0) - 1, 0), replies: childReplies })
        continue
      }
    }
    result.push(node)
  }
  return [result, didRemove]
}

function removeNode(nodes, targetId) {
  return removeNodeRec(nodes, targetId)[0]
}

function CommentBubble({ node, destinationId, isAuthenticated, currentUserId, isReply, replyingTo, onReplyPosted, onCommentUpdated, onCommentDeleted }) {
  const navigate = useNavigate()

  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(node.text)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  const isOwner = isAuthenticated && currentUserId && node.author?.id === currentUserId
  const withinEditWindow = Date.now() - new Date(node.created_at).getTime() <= EDIT_WINDOW_MS
  const canEdit = isOwner && withinEditWindow
  const canDelete = isOwner

  function requireAuth() {
    if (!isAuthenticated) {
      navigate('/login')
      return false
    }
    return true
  }

  function handleStartReply() {
    if (!requireAuth()) return
    setIsReplying(true)
    setReplyText('')
  }

  async function handleSubmitReply(e) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!trimmed) return

    setReplySubmitting(true)
    setLocalError('')
    try {
      const response = await replyToComment(destinationId, node.id, trimmed)
      onReplyPosted(node.id, { ...response.reply, reply_count: 0, replies: [] })
      setIsReplying(false)
      setReplyText('')
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setReplySubmitting(false)
    }
  }

  function handleStartEdit() {
    setEditText(node.text)
    setIsEditing(true)
  }

  async function handleSubmitEdit(e) {
    e.preventDefault()
    const trimmed = editText.trim()
    if (!trimmed) return

    setEditSubmitting(true)
    setLocalError('')
    try {
      const response = await editComment(destinationId, node.id, trimmed)
      onCommentUpdated(node.id, response.comment)
      setIsEditing(false)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleteSubmitting(true)
    setLocalError('')
    try {
      await deleteComment(destinationId, node.id)
      onCommentDeleted(node.id)
    } catch (err) {
      setLocalError(err.message)
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="comment-section__comment">
      <div className={`comment-section__avatar ${isReply ? 'comment-section__avatar--small' : ''}`}>
        {(node.author?.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="comment-section__body">
        <div className="comment-section__meta">
          <span className="comment-section__author">{node.author?.name || 'Traveler'}</span>
          <span className="comment-section__date">{formatDate(node.created_at)}</span>
          {node.edited && <span className="comment-section__edited-tag">(edited)</span>}
        </div>

        {replyingTo && (
          <div className="comment-section__reply-context">
            <span className="comment-section__reply-context-icon">↳</span>
            Replying to <strong>{replyingTo.author?.name || 'Traveler'}</strong>
          </div>
        )}

        {isEditing ? (
          <form className="comment-section__edit-form" onSubmit={handleSubmitEdit}>
            <textarea
              className="comment-section__textarea comment-section__textarea--reply"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="comment-section__reply-actions">
              <button type="button" className="comment-section__cancel" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="comment-section__submit comment-section__submit--reply"
                disabled={editSubmitting || !editText.trim()}
              >
                {editSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <p className="comment-section__text">{node.text}</p>
        )}

        {localError && <p className="comment-section__status comment-section__status--error">{localError}</p>}

        {!isEditing && (
          <div className="comment-section__actions">
            <button type="button" className="comment-section__reply-trigger" onClick={handleStartReply}>
              Reply
            </button>
            {canEdit && (
              <button type="button" className="comment-section__reply-trigger" onClick={handleStartEdit}>
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="comment-section__reply-trigger comment-section__reply-trigger--danger"
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}

        {isReplying && (
          <form className="comment-section__reply-form" onSubmit={handleSubmitReply}>
            <textarea
              className="comment-section__textarea comment-section__textarea--reply"
              placeholder={`Reply to ${node.author?.name || 'this comment'}...`}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="comment-section__reply-actions">
              <button type="button" className="comment-section__cancel" onClick={() => setIsReplying(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="comment-section__submit comment-section__submit--reply"
                disabled={replySubmitting || !replyText.trim()}
              >
                {replySubmitting ? 'Posting...' : 'Post reply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function RootComment({ comment, destinationId, isAuthenticated, currentUserId, onReplyPosted, onCommentUpdated, onCommentDeleted }) {
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const [visibleReplyCount, setVisibleReplyCount] = useState(REPLY_PAGE_SIZE)

  const allReplies = flattenDescendants(comment)
  const replyCount = comment.reply_count || 0
  const visibleReplies = allReplies.slice(0, visibleReplyCount)
  const remainingReplies = allReplies.length - visibleReplies.length

  function handleHideReplies() {
    setRepliesExpanded(false)
    setVisibleReplyCount(REPLY_PAGE_SIZE)
  }

  function handleReplyPosted(parentId, reply) {
    setRepliesExpanded(true)
    onReplyPosted(parentId, reply)
  }

  return (
    <div className="comment-section__node">
      <CommentBubble
        node={comment}
        destinationId={destinationId}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        isReply={false}
        onReplyPosted={handleReplyPosted}
        onCommentUpdated={onCommentUpdated}
        onCommentDeleted={onCommentDeleted}
      />

      {replyCount > 0 && !repliesExpanded && (
        <button type="button" className="comment-section__view-replies" onClick={() => setRepliesExpanded(true)}>
          View replies ({replyCount})
        </button>
      )}

      {replyCount > 0 && repliesExpanded && (
        <>
          <button type="button" className="comment-section__view-replies" onClick={handleHideReplies}>
            Hide replies
          </button>

          <div className="comment-section__replies">
            {visibleReplies.map(reply => (
              <CommentBubble
                key={reply.id}
                node={reply}
                destinationId={destinationId}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                isReply
                replyingTo={reply.replyingTo}
                onReplyPosted={handleReplyPosted}
                onCommentUpdated={onCommentUpdated}
                onCommentDeleted={onCommentDeleted}
              />
            ))}

            {remainingReplies > 0 && (
              <button
                type="button"
                className="comment-section__view-replies"
                onClick={() => setVisibleReplyCount(prev => prev + REPLY_PAGE_SIZE)}
              >
                View more replies ({remainingReplies} remaining)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function CommentSection({ destinationId, isAuthenticated, focusOnMount }) {
  const navigate = useNavigate()
  const sectionRef = useRef(null)
  const textareaRef = useRef(null)
  const currentUserId = getUser()?.id || null

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [visibleRootCount, setVisibleRootCount] = useState(ROOT_PAGE_SIZE)

  useEffect(() => {
    async function loadComments() {
      setLoading(true)
      setError('')
      try {
        const response = await getComments(destinationId)
        setComments(response.comments || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [destinationId])

  useEffect(() => {
    if (!loading && focusOnMount && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      textareaRef.current?.focus()
    }
  }, [loading, focusOnMount])

  async function handleSubmitComment(e) {
    e.preventDefault()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const trimmed = commentText.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError('')
    try {
      const response = await addComment(destinationId, trimmed)
      setComments(prev => [{ ...response.comment, replies: response.comment.replies || [], reply_count: 0 }, ...prev])
      setCommentText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReplyPosted(parentId, reply) {
    setComments(prev => insertReply(prev, parentId, reply))
  }

  function handleCommentUpdated(id, patch) {
    setComments(prev => mapNode(prev, id, node => ({ ...node, ...patch })))
  }

  function handleCommentDeleted(id) {
    setComments(prev => removeNode(prev, id))
  }

  const totalCount = countAllNodes(comments)
  const visibleRoots = comments.slice(0, visibleRootCount)
  const remainingRoots = comments.length - visibleRoots.length

  return (
    <section className="comment-section" ref={sectionRef} id="comments">
      <h2 className="comment-section__title">Comments ({totalCount})</h2>

      {isAuthenticated ? (
        <form className="comment-section__form" onSubmit={handleSubmitComment}>
          <textarea
            ref={textareaRef}
            className="comment-section__textarea"
            placeholder="Share your thoughts about this place..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            rows={3}
          />
          <button
            type="submit"
            className="comment-section__submit"
            disabled={submitting || !commentText.trim()}
          >
            {submitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      ) : (
        <button type="button" className="comment-section__login-prompt" onClick={() => navigate('/login')}>
          Log in to leave a comment
        </button>
      )}

      {error && <p className="comment-section__status comment-section__status--error">{error}</p>}
      {loading && <p className="comment-section__status">Loading comments...</p>}

      {!loading && comments.length === 0 && !error && (
        <p className="comment-section__status">No comments yet. Be the first to share your thoughts.</p>
      )}

      {!loading && comments.length > 0 && (
        <ul className="comment-section__list">
          {visibleRoots.map(comment => (
            <li key={comment.id} className="comment-section__item">
              <RootComment
                comment={comment}
                destinationId={destinationId}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                onReplyPosted={handleReplyPosted}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
              />
            </li>
          ))}
        </ul>
      )}

      {remainingRoots > 0 && (
        <button
          type="button"
          className="comment-section__view-more"
          onClick={() => setVisibleRootCount(prev => prev + ROOT_PAGE_SIZE)}
        >
          View more comments ({remainingRoots} remaining)
        </button>
      )}

      {visibleRootCount > ROOT_PAGE_SIZE && (
        <button
          type="button"
          className="comment-section__view-more"
          onClick={() => setVisibleRootCount(ROOT_PAGE_SIZE)}
        >
          Hide comments
        </button>
      )}
    </section>
  )
}

export default CommentSection