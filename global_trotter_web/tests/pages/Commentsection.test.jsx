import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommentSection from '../../src/components/CommentSection.jsx'
import { getComments, addComment, replyToComment, deleteComment } from '../../src/services/commentService.js'
import { getUser } from '../../src/services/tokenStorage.js'

jest.mock('../../src/services/commentService.js')
jest.mock('../../src/services/tokenStorage.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const COMMENT = {
  id: 'cmt_001',
  destination_id: 'dest_001',
  author: { id: 'usr_001', name: 'Ada' },
  text: 'Loved the atmosphere here.',
  created_at: '2026-07-10T09:00:00Z',
  reply_count: 1,
  replies: [
    {
      id: 'rpl_001',
      author: { id: 'usr_002', name: 'Beno' },
      text: 'Totally agree!',
      created_at: '2026-07-11T09:00:00Z',
      reply_count: 0,
      replies: []
    }
  ]
}

function makeComment(id, text, createdAt) {
  return {
    id,
    destination_id: 'dest_001',
    author: { id: 'usr_001', name: 'Ada' },
    text,
    created_at: createdAt,
    reply_count: 0,
    replies: []
  }
}

function renderCommentSection(props = {}) {
  return render(
    <MemoryRouter>
      <CommentSection destinationId="dest_001" isAuthenticated={true} {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  getUser.mockReturnValue(null)
  getComments.mockResolvedValue({ comments: [] })
  addComment.mockResolvedValue({ comment: { ...COMMENT, replies: [] } })
  replyToComment.mockResolvedValue({ reply: COMMENT.replies[0] })
  deleteComment.mockResolvedValue({ deleted_id: COMMENT.id })
})

describe('CommentSection', () => {
  test('shows a loading state before comments arrive', async () => {
    renderCommentSection()

    expect(screen.getByText(/loading comments/i)).toBeInTheDocument()

    await screen.findByText(/no comments yet/i)
  })

  test('shows an empty state when there are no comments', async () => {
    renderCommentSection()

    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument()
    expect(screen.getByText('Comments (0)')).toBeInTheDocument()
  })

  test('renders comments with a combined count, replies collapsed until requested', async () => {
    getComments.mockResolvedValue({ comments: [COMMENT] })
    renderCommentSection()

    expect(await screen.findByText('Loved the atmosphere here.')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Comments (2)')).toBeInTheDocument()

    expect(screen.queryByText('Totally agree!')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view replies \(1\)/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view replies \(1\)/i }))

    expect(await screen.findByText('Totally agree!')).toBeInTheDocument()
    expect(screen.getByText('Beno')).toBeInTheDocument()
  })

  test('shows an error message when comments fail to load', async () => {
    getComments.mockRejectedValue(new Error('Network error'))
    renderCommentSection()

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  test('submits a new comment and prepends it to the list', async () => {
    getComments.mockResolvedValue({
      comments: [makeComment('cmt_old', 'An older comment', '2026-07-01T09:00:00Z')]
    })
    renderCommentSection()

    await screen.findByText('An older comment')

    fireEvent.change(screen.getByPlaceholderText(/share your thoughts/i), {
      target: { value: 'Amazing place to visit.' }
    })
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith('dest_001', 'Amazing place to visit.')
    })

    const items = await screen.findAllByRole('listitem')
    expect(items[0]).toHaveTextContent(COMMENT.text)
    expect(items[1]).toHaveTextContent('An older comment')
  })

  test('does not submit a comment that is only whitespace', async () => {
    renderCommentSection()

    await screen.findByText(/no comments yet/i)
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled()
  })

  test('shows a login prompt instead of a form when logged out', async () => {
    renderCommentSection({ isAuthenticated: false })

    await screen.findByText(/no comments yet/i)
    expect(screen.getByRole('button', { name: /log in to leave a comment/i })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/share your thoughts/i)).not.toBeInTheDocument()
  })

  test('clicking the login prompt navigates to /login', async () => {
    renderCommentSection({ isAuthenticated: false })

    await screen.findByText(/no comments yet/i)
    fireEvent.click(screen.getByRole('button', { name: /log in to leave a comment/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('opens a reply form and submits a reply', async () => {
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, reply_count: 0, replies: [] }] })
    renderCommentSection()

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))

    const replyBox = screen.getByPlaceholderText(/reply to ada/i)
    fireEvent.change(replyBox, { target: { value: 'Totally agree!' } })
    fireEvent.click(screen.getByRole('button', { name: /post reply/i }))

    await waitFor(() => {
      expect(replyToComment).toHaveBeenCalledWith('dest_001', 'cmt_001', 'Totally agree!')
    })
    expect(await screen.findByText('Totally agree!')).toBeInTheDocument()
  })

  test('cancelling a reply hides the reply form', async () => {
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, reply_count: 0, replies: [] }] })
    renderCommentSection()

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByPlaceholderText(/reply to ada/i)).not.toBeInTheDocument()
  })

  test('clicking reply while logged out navigates to /login instead of opening a form', async () => {
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, reply_count: 0, replies: [] }] })
    renderCommentSection({ isAuthenticated: false })

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(screen.queryByPlaceholderText(/reply to ada/i)).not.toBeInTheDocument()
  })

  test('deletes a comment immediately without a confirmation dialog', async () => {
    getUser.mockReturnValue({ id: 'usr_001' })
    const confirmSpy = jest.spyOn(window, 'confirm')
    getComments.mockResolvedValue({ comments: [makeComment('cmt_001', 'Loved the atmosphere here.', '2026-07-10T09:00:00Z')] })
    renderCommentSection()

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(confirmSpy).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith('dest_001', 'cmt_001')
    })
    await waitFor(() => {
      expect(screen.queryByText('Loved the atmosphere here.')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Comments (0)')).toBeInTheDocument()
  })

  test('paginates root comments 3 at a time', async () => {
    getComments.mockResolvedValue({
      comments: [
        makeComment('cmt_1', 'First', '2026-07-01T09:00:00Z'),
        makeComment('cmt_2', 'Second', '2026-07-02T09:00:00Z'),
        makeComment('cmt_3', 'Third', '2026-07-03T09:00:00Z'),
        makeComment('cmt_4', 'Fourth', '2026-07-04T09:00:00Z'),
        makeComment('cmt_5', 'Fifth', '2026-07-05T09:00:00Z')
      ]
    })
    renderCommentSection()

    await screen.findByText('First')
    expect(screen.queryByText('Fourth')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view more comments \(2 remaining\)/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view more comments/i }))

    expect(await screen.findByText('Fourth')).toBeInTheDocument()
    expect(screen.getByText('Fifth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /view more comments/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide comments/i }))

    expect(screen.queryByText('Fourth')).not.toBeInTheDocument()
    expect(screen.queryByText('Fifth')).not.toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view more comments \(2 remaining\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hide comments/i })).not.toBeInTheDocument()
  })

  test('paginates replies 3 at a time', async () => {
    const manyReplies = Array.from({ length: 5 }, (_, i) => ({
      id: `rpl_${i}`,
      author: { id: `usr_${i}`, name: `Reply ${i}` },
      text: `Reply text ${i}`,
      created_at: `2026-07-1${i}T09:00:00Z`,
      reply_count: 0,
      replies: []
    }))
    getComments.mockResolvedValue({
      comments: [{ ...COMMENT, reply_count: 5, replies: manyReplies }]
    })
    renderCommentSection()

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /view replies \(5\)/i }))

    expect(await screen.findByText('Reply text 0')).toBeInTheDocument()
    expect(screen.getByText('Reply text 1')).toBeInTheDocument()
    expect(screen.getByText('Reply text 2')).toBeInTheDocument()
    expect(screen.queryByText('Reply text 3')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view more replies \(2 remaining\)/i }))

    expect(await screen.findByText('Reply text 3')).toBeInTheDocument()
    expect(screen.getByText('Reply text 4')).toBeInTheDocument()
  })

  test('scrolls to and focuses the comment box when focusOnMount is true', async () => {
    renderCommentSection({ focusOnMount: true })

    await screen.findByText(/no comments yet/i)

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toHaveFocus()
  })
})