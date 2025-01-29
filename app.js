const { useState, useEffect } = React;

// Utility function for formatting dates
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function ConfirmationModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal">
      <div className="modal-content confirmation-modal">
        <h2>Confirm Action</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="btn-danger" onClick={onConfirm}>Confirm</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Forum() {
  const [view, setView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const room = new WebsimSocket();

  useEffect(() => {
    async function checkAdmin() {
      const creator = await window.websim.getCreatedBy();
      const isCreator = room.party.client.username === creator.username;
      setIsAdmin(isCreator);
    }
    checkAdmin();
  }, []);

  const handleBack = () => {
    if (selectedThread) {
      setSelectedThread(null);
      setView('threads');
    } else if (selectedTopic) {
      setSelectedTopic(null);
      setView('topics');
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setView('categories');
    }
  };

  return (
    <div className="container">
      {view !== 'categories' && (
        <div className="breadcrumb">
          <a href="#" onClick={() => setView('categories')}>Categories</a>
          {selectedCategory && (
            <>
              {' > '}
              <a href="#" onClick={() => setView('topics')}>{selectedCategory.title}</a>
            </>
          )}
          {selectedTopic && (
            <>
              {' > '}
              <a href="#" onClick={() => setView('threads')}>{selectedTopic.title}</a>
            </>
          )}
          {selectedThread && (
            <>
              {' > '}
              {selectedThread.title}
            </>
          )}
        </div>
      )}

      {view === 'categories' && (
        <Categories 
          room={room}
          isAdmin={isAdmin}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setView('topics');
          }}
        />
      )}

      {view === 'topics' && selectedCategory && (
        <Topics 
          room={room}
          categoryId={selectedCategory.id}
          isAdmin={isAdmin}
          onSelectTopic={(topic) => {
            setSelectedTopic(topic);
            setView('threads');
          }}
        />
      )}

      {view === 'threads' && selectedTopic && (
        <Threads 
          room={room}
          topicId={selectedTopic.id}
          onSelectThread={(thread) => {
            setSelectedThread(thread);
            setView('thread');
          }}
        />
      )}

      {view === 'thread' && selectedThread && (
        <ThreadView 
          room={room}
          thread={selectedThread}
        />
      )}
    </div>
  );
}

function Categories({ room, isAdmin, onSelectCategory }) {
  const categories = React.useSyncExternalStore(
    room.collection('category').subscribe,
    room.collection('category').getList
  );
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [error, setError] = useState('');

  // Get thread counts for each category
  const threads = React.useSyncExternalStore(
    room.collection('thread').subscribe,
    room.collection('thread').getList
  );
  
  const topics = React.useSyncExternalStore(
    room.collection('topic').subscribe,
    room.collection('topic').getList
  );

  const getCategoryStats = (categoryId) => {
    const categoryTopics = topics.filter(t => t.categoryId === categoryId);
    const topicIds = categoryTopics.map(t => t.id);
    const categoryThreads = threads.filter(t => topicIds.includes(t.topicId));
    
    const lastThread = categoryThreads.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )[0];

    return {
      topicCount: categoryTopics.length,
      threadCount: categoryThreads.length,
      lastActivity: lastThread?.created_at
    };
  };

  const handleCreateCategory = async () => {
    if (!newCategoryTitle.trim()) {
      setError('Category title is required');
      return;
    }
    try {
      await room.collection('category').create({
        title: newCategoryTitle.trim(),
        created_at: new Date().toISOString()
      });
      setNewCategoryTitle('');
      setShowModal(false);
      setError('');
    } catch (err) {
      setError('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Delete all associated topics first
      const categoryTopics = topics.filter(t => t.categoryId === categoryId);
      for (const topic of categoryTopics) {
        // Delete all threads in the topic
        const topicThreads = threads.filter(t => t.topicId === topic.id);
        for (const thread of topicThreads) {
          await room.collection('thread').delete(thread.id);
        }
        await room.collection('topic').delete(topic.id);
      }
      await room.collection('category').delete(categoryId);
      setShowDeleteModal(null);
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  return (
    <div>
      <div className="category-header">
        <h1 className="title">Categories</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}>Create Category</button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {categories.length === 0 && (
        <div className="empty-state">
          <p>No categories yet. {isAdmin && 'Create one to get started!'}</p>
        </div>
      )}

      {categories.map(category => {
        const stats = getCategoryStats(category.id);
        return (
          <div key={category.id} className="category clickable">
            <div className="category-header">
              <div onClick={() => onSelectCategory(category)}>
                <h2>{category.title}</h2>
                <div className="stats">
                  <span>{stats.topicCount} topics</span>
                  <span>{stats.threadCount} threads</span>
                  {stats.lastActivity && (
                    <span>Last activity: {formatDate(stats.lastActivity)}</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button 
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(category.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create Category</h2>
            <input
              type="text"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              placeholder="Category Title"
            />
            <div className="modal-buttons">
              <button onClick={handleCreateCategory}>Create</button>
              <button className="btn-secondary" onClick={() => {
                setShowModal(false);
                setError('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <ConfirmationModal
          message="Are you sure you want to delete this category? This will delete all topics and threads within it."
          onConfirm={() => handleDeleteCategory(showDeleteModal)}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  );
}

function Topics({ room, categoryId, isAdmin, onSelectTopic }) {
  const topics = React.useSyncExternalStore(
    room.collection('topic').filter({ categoryId }).subscribe,
    room.collection('topic').filter({ categoryId }).getList
  );
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [error, setError] = useState('');

  // Get thread counts for each topic
  const threads = React.useSyncExternalStore(
    room.collection('thread').subscribe,
    room.collection('thread').getList
  );

  const getTopicStats = (topicId) => {
    const topicThreads = threads.filter(t => t.topicId === topicId);
    return {
      threadCount: topicThreads.length,
      lastThread: topicThreads.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0]
    };
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim()) {
      setError('Topic title is required');
      return;
    }
    try {
      await room.collection('topic').create({
        title: newTopicTitle.trim(),
        categoryId,
        created_at: new Date().toISOString()
      });
      setNewTopicTitle('');
      setShowModal(false);
      setError('');
    } catch (err) {
      setError('Failed to create topic');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    try {
      // Delete all threads in the topic first
      const topicThreads = threads.filter(t => t.topicId === topicId);
      for (const thread of topicThreads) {
        await room.collection('thread').delete(thread.id);
      }
      await room.collection('topic').delete(topicId);
      setShowDeleteModal(null);
    } catch (err) {
      setError('Failed to delete topic');
    }
  };

  return (
    <div>
      <div className="topic-header">
        <h1 className="title">Topics</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}>Create Topic</button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {topics.length === 0 && (
        <div className="empty-state">
          <p>No topics yet. {isAdmin && 'Create one to get started!'}</p>
        </div>
      )}

      {topics.map(topic => {
        const stats = getTopicStats(topic.id);
        return (
          <div key={topic.id} className="topic clickable">
            <div className="topic-header">
              <div onClick={() => onSelectTopic(topic)}>
                <h2>{topic.title}</h2>
                <div className="stats">
                  <span>{stats.threadCount} threads</span>
                  {stats.lastThread && (
                    <span>Last thread: {formatDate(stats.lastThread.created_at)}</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button 
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(topic.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create Topic</h2>
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Topic Title"
            />
            <div className="modal-buttons">
              <button onClick={handleCreateTopic}>Create</button>
              <button className="btn-secondary" onClick={() => {
                setShowModal(false);
                setError('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <ConfirmationModal
          message="Are you sure you want to delete this topic? This will delete all threads within it."
          onConfirm={() => handleDeleteTopic(showDeleteModal)}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  );
}

function Threads({ room, topicId, onSelectThread }) {
  const threads = React.useSyncExternalStore(
    room.collection('thread').filter({ topicId }).subscribe,
    room.collection('thread').filter({ topicId }).getList
  );
  const [showModal, setShowModal] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [error, setError] = useState('');

  const comments = React.useSyncExternalStore(
    room.collection('comment').subscribe,
    room.collection('comment').getList
  );

  const getThreadStats = (threadId) => {
    const threadComments = comments.filter(c => c.threadId === threadId);
    return {
      commentCount: threadComments.length,
      lastComment: threadComments.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0]
    };
  };

  const handleCreateThread = async () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      setError('Title and content are required');
      return;
    }
    try {
      await room.collection('thread').create({
        title: newThread.title.trim(),
        content: newThread.content.trim(),
        tags: newThread.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        topicId,
        created_at: new Date().toISOString()
      });
      setNewThread({ title: '', content: '', tags: '' });
      setShowModal(false);
      setError('');
    } catch (err) {
      setError('Failed to create thread');
    }
  };

  return (
    <div>
      <div className="thread-header">
        <h1 className="title">Threads</h1>
        <button onClick={() => setShowModal(true)}>Create Thread</button>
      </div>

      {error && <div className="error">{error}</div>}

      {threads.length === 0 && (
        <div className="empty-state">
          <p>No threads yet. Be the first to create one!</p>
        </div>
      )}

      <div className="thread-list">
        {threads.map(thread => {
          const stats = getThreadStats(thread.id);
          return (
            <div key={thread.id} className="thread-item clickable" onClick={() => onSelectThread(thread)}>
              <h3>{thread.title}</h3>
              <div className="user-info">
                <img src={`https://images.websim.ai/avatar/${thread.username}`} className="avatar" alt={thread.username} />
                <span>{thread.username}</span>
                <span className="metadata">• {formatDate(thread.created_at)}</span>
              </div>
              <div className="thread-preview">{thread.content}</div>
              <div className="tags">
                {thread.tags?.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <div className="stats">
                <span>{stats.commentCount} comments</span>
                {stats.lastComment && (
                  <span>Last comment: {formatDate(stats.lastComment.created_at)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create Thread</h2>
            <input
              type="text"
              value={newThread.title}
              onChange={(e) => setNewThread({...newThread, title: e.target.value})}
              placeholder="Thread Title"
            />
            <textarea
              value={newThread.content}
              onChange={(e) => setNewThread({...newThread, content: e.target.value})}
              placeholder="Thread Content"
              rows="5"
            />
            <input
              type="text"
              value={newThread.tags}
              onChange={(e) => setNewThread({...newThread, tags: e.target.value})}
              placeholder="Tags (comma-separated)"
            />
            <div className="modal-buttons">
              <button onClick={handleCreateThread}>Create</button>
              <button className="btn-secondary" onClick={() => {
                setShowModal(false);
                setError('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadView({ room, thread }) {
  const comments = React.useSyncExternalStore(
    room.collection('comment').filter({ threadId: thread.id }).subscribe,
    room.collection('comment').filter({ threadId: thread.id }).getList
  );
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedThread, setEditedThread] = useState({
    title: thread.title,
    content: thread.content,
    tags: thread.tags?.join(', ') || ''
  });

  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      await room.collection('comment').create({
        content: newComment.trim(),
        threadId: thread.id,
        created_at: new Date().toISOString()
      });
      setNewComment('');
      setError('');
    } catch (err) {
      setError('Failed to post comment');
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editedContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      await room.collection('comment').update(commentId, {
        content: editedContent.trim()
      });
      setEditingComment(null);
      setError('');
    } catch (err) {
      setError('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await room.collection('comment').delete(commentId);
      setShowDeleteModal(null);
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const handleEditThread = async () => {
    if (!editedThread.title.trim() || !editedThread.content.trim()) {
      setError('Title and content are required');
      return;
    }
    try {
      await room.collection('thread').update(thread.id, {
        title: editedThread.title.trim(),
        content: editedThread.content.trim(),
        tags: editedThread.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('Failed to update thread');
    }
  };

  const canEditThread = room.party.client.username === thread.username;

  return (
    <div className="thread">
      {error && <div className="error">{error}</div>}

      {isEditing ? (
        <div>
          <input
            type="text"
            value={editedThread.title}
            onChange={(e) => setEditedThread({...editedThread, title: e.target.value})}
            placeholder="Thread Title"
          />
          <textarea
            value={editedThread.content}
            onChange={(e) => setEditedThread({...editedThread, content: e.target.value})}
            placeholder="Thread Content"
            rows="5"
          />
          <input
            type="text"
            value={editedThread.tags}
            onChange={(e) => setEditedThread({...editedThread, tags: e.target.value})}
            placeholder="Tags (comma-separated)"
          />
          <div className="edit-controls">
            <button onClick={handleEditThread}>Save</button>
            <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="thread-header">
            <h1>{thread.title}</h1>
            {canEditThread && (
              <button onClick={() => setIsEditing(true)}>Edit</button>
            )}
          </div>
          <div className="user-info">
            <img src={`https://images.websim.ai/avatar/${thread.username}`} className="avatar" alt={thread.username} />
            <span>{thread.username}</span>
            <span className="metadata">• {formatDate(thread.created_at)}</span>
          </div>
          <p>{thread.content}</p>
          <div className="tags">
            {thread.tags?.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </>
      )}

      <div className="comments">
        <h2>Comments</h2>
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="user-info">
              <img src={`https://images.websim.ai/avatar/${comment.username}`} className="avatar" alt={comment.username} />
              <span>{comment.username}</span>
              <span className="metadata">• {formatDate(comment.created_at)}</span>
            </div>
            
            {editingComment === comment.id ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows="3"
                />
                <div className="edit-controls">
                  <button onClick={() => handleEditComment(comment.id)}>Save</button>
                  <button className="btn-secondary" onClick={() => setEditingComment(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p>{comment.content}</p>
                {room.party.client.username === comment.username && (
                  <div className="comment-actions">
                    <button
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditedContent(comment.content);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => setShowDeleteModal(comment.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows="3"
          />
          <button onClick={handleCreateComment}>Post Comment</button>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmationModal
          message="Are you sure you want to delete this comment?"
          onConfirm={() => handleDeleteComment(showDeleteModal)}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  );
}

ReactDOM.render(<Forum />, document.getElementById('root'));