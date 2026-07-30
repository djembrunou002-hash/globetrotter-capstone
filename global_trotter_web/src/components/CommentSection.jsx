import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComments, addComment, replyToComment, editComment, deleteComment } from '../services/commentService.js'
import { getUser } from '../services/tokenStorage.js'
import '../styles/CommentSection.css'

const EDIT_WINDOW_MS = 15 * 60 * 1000
const ROOT_PAGE_SIZE = 3

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function countAllNodes(nodes) {
  return nodes.reduce((sum, node) => sum + 1 + countAllNodes(node.replies || []), 0)
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

function CommentNode({ node, destinationId, isAuthenticated, currentUserId, depth, onReplyPosted, onCommentUpdated }) {
  const navigate = useNavigate()

  const [repliesExpanded, setRepliesExpanded] = useState((node.replies || []).length > 0)
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
  const canEdit = isOwner && !node.deleted && withinEditWindow
  const canDelete = isOwner && !node.deleted

  const replies = node.replies || []
  const replyCount = node.reply_count || 0

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
      setRepliesExpanded(true)
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
    if (!window.confirm('Delete this comment?')) return

    setDeleteSubmitting(true)
    setLocalError('')
    try {
      const response = await deleteComment(destinationId, node.id)
      onCommentUpdated(node.id, response.comment)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="comment-section__node">
      <div className="comment-section__comment">
        <div className={`comment-section__avatar ${depth > 0 ? 'comment-section__avatar--small' : ''}`}>
          {(node.author?.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="comment-section__body">
          <div className="comment-section__meta">
            <span className="comment-section__author">{node.author?.name || 'Traveler'}</span>
            <span className="comment-section__date">{formatDate(node.created_at)}</span>
            {node.edited && <span className="comment-section__edited-tag">(edited)</span>}
          </div>

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
            <p className={`comment-section__text ${node.deleted ? 'comment-section__text--deleted' : ''}`}>
              {node.text}
            </p>
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

          {replyCount > 0 && !repliesExpanded && (
            <button
              type="button"
              className="comment-section__view-replies"
              onClick={() => setRepliesExpanded(true)}
            >
              View replies ({replyCount})
            </button>
          )}

          {replyCount > 0 && repliesExpanded && (
            <button
              type="button"
              className="comment-section__view-replies"
              onClick={() => setRepliesExpanded(false)}
            >
              Hide replies
            </button>
          )}

          {repliesExpanded && replies.length > 0 && (
            <div className="comment-section__replies">
              {replies.map(reply => (
                <CommentNode
                  key={reply.id}
                  node={reply}
                  destinationId={destinationId}
                  isAuthenticated={isAuthenticated}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  onReplyPosted={onReplyPosted}
                  onCommentUpdated={onCommentUpdated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
      setComments(prev => [...prev, { ...response.comment, replies: response.comment.replies || [], reply_count: 0 }])
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
              <CommentNode
                node={comment}
                destinationId={destinationId}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                depth={0}
                onReplyPosted={handleReplyPosted}
                onCommentUpdated={handleCommentUpdated}
              />
            </li>
          ))}
        </ul>
      )}

      {remainingRoots > 0 && (
        <button
          type="button"
          className="comment-section__view-more"
          onClick={() => setVisibleRootCount(comments.length)}
        >
          View more comments ({remainingRoots} remaining)
        </button>
      )}
    </section>
  )
}

export default CommentSection