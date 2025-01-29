const { useState, useEffect } = React;

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
  const [newCategoryTitle, setNewCategoryTitle] = useState('');

  const handleCreateCategory = async () => {
    if (newCategoryTitle.trim()) {
      await room.collection('category').create({
        title: newCategoryTitle.trim()
      });
      setNewCategoryTitle('');
      setShowModal(false);
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

      {categories.map(category => (
        <div key={category.id} className="category" onClick={() => onSelectCategory(category)}>
          <h2>{category.title}</h2>
        </div>
      ))}

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
            <button onClick={handleCreateCategory}>Create</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
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
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const handleCreateTopic = async () => {
    if (newTopicTitle.trim()) {
      await room.collection('topic').create({
        title: newTopicTitle.trim(),
        categoryId
      });
      setNewTopicTitle('');
      setShowModal(false);
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

      {topics.map(topic => (
        <div key={topic.id} className="topic" onClick={() => onSelectTopic(topic)}>
          <h2>{topic.title}</h2>
        </div>
      ))}

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
            <button onClick={handleCreateTopic}>Create</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
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

  const handleCreateThread = async () => {
    if (newThread.title.trim() && newThread.content.trim()) {
      await room.collection('thread').create({
        title: newThread.title.trim(),
        content: newThread.content.trim(),
        tags: newThread.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        topicId
      });
      setNewThread({ title: '', content: '', tags: '' });
      setShowModal(false);
    }
  };

  return (
    <div>
      <div className="thread-header">
        <h1 className="title">Threads</h1>
        <button onClick={() => setShowModal(true)}>Create Thread</button>
      </div>

      <div className="thread-list">
        {threads.map(thread => (
          <div key={thread.id} className="thread-item" onClick={() => onSelectThread(thread)}>
            <h3>{thread.title}</h3>
            <div className="user-info">
              <img src={`https://images.websim.ai/avatar/${thread.username}`} className="avatar" />
              <span>{thread.username}</span>
            </div>
            <div className="tags">
              {thread.tags?.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
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
            <button onClick={handleCreateThread}>Create</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
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

  const handleCreateComment = async () => {
    if (newComment.trim()) {
      await room.collection('comment').create({
        content: newComment.trim(),
        threadId: thread.id
      });
      setNewComment('');
    }
  };

  return (
    <div className="thread">
      <h1>{thread.title}</h1>
      <div className="user-info">
        <img src={`https://images.websim.ai/avatar/${thread.username}`} className="avatar" />
        <span>{thread.username}</span>
      </div>
      <p>{thread.content}</p>
      <div className="tags">
        {thread.tags?.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      <div className="comments">
        <h2>Comments</h2>
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="user-info">
              <img src={`https://images.websim.ai/avatar/${comment.username}`} className="avatar" />
              <span>{comment.username}</span>
            </div>
            <p>{comment.content}</p>
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
    </div>
  );
}

ReactDOM.render(<Forum />, document.getElementById('root'));