import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComments, addComment, replyToComment } from '../services/commentService.js'
import '../styles/CommentSection.css'

function CommentSection({ destinationId, isAuthenticated, focusOnMount }) {
  const navigate = useNavigate()
  const sectionRef = useRef(null)
  const textareaRef = useRef(null)

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

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
      setComments(prev => [...prev, { ...response.comment, replies: response.comment.replies || [] }])
      setCommentText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartReply(commentId) {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setReplyingTo(commentId)
    setReplyText('')
  }

  function handleCancelReply() {
    setReplyingTo(null)
    setReplyText('')
  }

  async function handleSubmitReply(e, commentId) {
    e.preventDefault()

    const trimmed = replyText.trim()
    if (!trimmed) return

    setReplySubmitting(true)
    setError('')
    try {
      const response = await replyToComment(destinationId, commentId, trimmed)
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, replies: [...(comment.replies || []), response.reply] }
            : comment
        )
      )
      setReplyingTo(null)
      setReplyText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setReplySubmitting(false)
    }
  }

  function formatDate(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const totalCount = comments.reduce((sum, comment) => sum + 1 + (comment.replies?.length || 0), 0)

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
          {comments.map(comment => (
            <li key={comment.id} className="comment-section__item">
              <div className="comment-section__comment">
                <div className="comment-section__avatar">
                  {(comment.author?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="comment-section__body">
                  <div className="comment-section__meta">
                    <span className="comment-section__author">{comment.author?.name || 'Traveler'}</span>
                    <span className="comment-section__date">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="comment-section__text">{comment.text}</p>
                  <button
                    type="button"
                    className="comment-section__reply-trigger"
                    onClick={() => handleStartReply(comment.id)}
                  >
                    Reply
                  </button>

                  {replyingTo === comment.id && (
                    <form
                      className="comment-section__reply-form"
                      onSubmit={e => handleSubmitReply(e, comment.id)}
                    >
                      <textarea
                        className="comment-section__textarea comment-section__textarea--reply"
                        placeholder={`Reply to ${comment.author?.name || 'this comment'}...`}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="comment-section__reply-actions">
                        <button type="button" className="comment-section__cancel" onClick={handleCancelReply}>
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

                  {comment.replies && comment.replies.length > 0 && (
                    <ul className="comment-section__replies">
                      {comment.replies.map(reply => (
                        <li key={reply.id} className="comment-section__reply">
                          <div className="comment-section__avatar comment-section__avatar--small">
                            {(reply.author?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-section__body">
                            <div className="comment-section__meta">
                              <span className="comment-section__author">{reply.author?.name || 'Traveler'}</span>
                              <span className="comment-section__date">{formatDate(reply.created_at)}</span>
                            </div>
                            <p className="comment-section__text">{reply.text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CommentSection