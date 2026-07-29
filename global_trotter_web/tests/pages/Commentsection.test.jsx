import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommentSection from '../../src/components/CommentSection.jsx'
import { getComments, addComment, replyToComment } from '../../src/services/commentService.js'

jest.mock('../../src/services/commentService.js')

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
  replies: [
    {
      id: 'rpl_001',
      author: { id: 'usr_002', name: 'Beno' },
      text: 'Totally agree!',
      created_at: '2026-07-11T09:00:00Z'
    }
  ]
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
  getComments.mockResolvedValue({ comments: [] })
  addComment.mockResolvedValue({ comment: { ...COMMENT, replies: [] } })
  replyToComment.mockResolvedValue({ reply: COMMENT.replies[0] })
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

  test('renders comments and their replies with a combined count', async () => {
    getComments.mockResolvedValue({ comments: [COMMENT] })
    renderCommentSection()

    expect(await screen.findByText('Loved the atmosphere here.')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Totally agree!')).toBeInTheDocument()
    expect(screen.getByText('Beno')).toBeInTheDocument()
    expect(screen.getByText('Comments (2)')).toBeInTheDocument()
  })

  test('shows an error message when comments fail to load', async () => {
    getComments.mockRejectedValue(new Error('Network error'))
    renderCommentSection()

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  test('submits a new comment and appends it to the list', async () => {
    getComments.mockResolvedValue({ comments: [] })
    renderCommentSection()

    await screen.findByText(/no comments yet/i)

    fireEvent.change(screen.getByPlaceholderText(/share your thoughts/i), {
      target: { value: 'Amazing place to visit.' }
    })
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith('dest_001', 'Amazing place to visit.')
    })
    expect(await screen.findByText(COMMENT.text)).toBeInTheDocument()
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
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, replies: [] }] })
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
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, replies: [] }] })
    renderCommentSection()

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByPlaceholderText(/reply to ada/i)).not.toBeInTheDocument()
  })

  test('clicking reply while logged out navigates to /login instead of opening a form', async () => {
    getComments.mockResolvedValue({ comments: [{ ...COMMENT, replies: [] }] })
    renderCommentSection({ isAuthenticated: false })

    await screen.findByText('Loved the atmosphere here.')
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(screen.queryByPlaceholderText(/reply to ada/i)).not.toBeInTheDocument()
  })

  test('scrolls to and focuses the comment box when focusOnMount is true', async () => {
    renderCommentSection({ focusOnMount: true })

    await screen.findByText(/no comments yet/i)

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toHaveFocus()
  })
})