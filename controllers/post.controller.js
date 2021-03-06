const { user, post, like, comment } = require( "../models" );
const { uploadErrors } = require( "../utils/errors.utils" );
const jwt = require( 'jsonwebtoken' );





module.exports.readPost = async ( req, res ) => {
	try {
		const posts = await post.findAll(
			{
				include: [
					{ model: user, attributes: [ "id", "firstName", "lastName", "profilPicture" ] },
					{ model: like, attributes: [ "userId", "postId" ] },
					{
						model: comment, attributes: [ "firstName", "lastName", "message", "id" ], include: [
							{
								model: user,
								attributes: [ "firstName", "lastName", "profilPicture" ],
							},
						],
					}
				],
			},
		);
		posts.sort( ( a, b ) => new Date( b.createdAt ) - new Date( a.createdAt ) );
		return res.json( posts );
	} catch ( err ) {
		console.log( err );
		return res.status( 500 ).json( err );
	}
};

module.exports.createPost = async ( req, res ) => {
	const { message, video } = req.body;
	const token = req.cookies.jwt;
	const decodedToken = jwt.verify( token, process.env.TOKEN_SECRET );
	const id = decodedToken.id;
	req.auth = { id };
	try {
		const userPost = await user.findOne( { where: { id: req.auth.id } } );
		if ( req.file ) {
			await post.create( {
				firstName: userPost.firstName,
				lastName: userPost.lastName,
				message,
				userId: userPost.id,
				picture: `${ req.protocol }://${ req.get( "host" ) }/post/${ req.file.filename
					}`,
				video,
			} );
		} else {
			await post.create( {
				firstName: userPost.firstName,
				lastName: userPost.lastName,
				message,
				userId: userPost.id,
				picture: "",
				video,
			} );

		}
		return res.json();
	} catch ( err ) {
		console.error( err );
		return res.status( 500 ).json( err );
	}
};

module.exports.updatePost = async ( req, res ) => {
	const id = req.params.id;
	try {
		const posts = await post.findOne( {
			where: { id },
		} );

		posts.message = req.body.message;
		posts.picture = req.body.picture;
		posts.video = req.body.video;
		await posts.save();
		return res.json( { posts } );
	} catch ( err ) {
		console.log( err );
		return res.status( 500 ).json( { error: "Something went wrong" } );
	}
};

module.exports.deletePost = async ( req, res ) => {
	const id = req.params.id;
	try {
		const Post = await post.findOne( { where: { id } } );
		await comment.destroy( { where: { postId: Post.id } } );
		await like.destroy( { where: { postId: Post.id } } );
		await post.destroy( { where: { id }, include: "likes", include: "comments" } );
		return res.json( { message: "Post deleted !" } );
	} catch ( err ) {
		console.log( err );
		return res.status( 500 ).json( { error: "Something went wrong" } );
	}
};

module.exports.likePost = async ( req, res ) => {
	const id = req.params.id;
	const token = req.cookies.jwt;
	const decodedToken = jwt.verify( token, process.env.TOKEN_SECRET );
	const userId = decodedToken.id;
	req.auth = { userId };

	try {
		const likedPost = await post.findOne( {
			where: { id },
			include: [ { model: like, attributes: [ "postId", "userId" ] } ],
		} );
		const alreadyLiked = await like.findOne( {
			where: { userId: req.auth.userId, postId: id },
		} );
		if ( !alreadyLiked ) {
			like.create( {
				postId: likedPost.id,
				userId: req.auth.userId,
			} );
		} else {
			return res.status( 500 ).json( { error: "Something went wrong" } );
		}

		await likedPost.save();
		return res.json( likedPost );
	} catch ( err ) {
		console.log( err );
		return res.status( 500 ).json( { error: "Something went wrong" } );
	}
};

module.exports.unlikePost = async ( req, res ) => {
	const id = req.params.id;
	const token = req.cookies.jwt;
	const decodedToken = jwt.verify( token, process.env.TOKEN_SECRET );
	const userId = decodedToken.id;
	req.auth = { userId };
	try {
		const likedPost = await post.findOne( { where: { id } } );
		const stillLiked = await like.findOne( {
			where: { userId: req.auth.userId, postId: likedPost.id },
		} );
		if ( stillLiked ) {
			await like.destroy( { where: { postId: likedPost.id } } );
		} else {

			return res.status( 500 ).json( { error: "Something went wrong" } );
		}
		return res.json( { message: "Comment deleted !" } );
	} catch ( err ) {
		console.log( err );
		return res.status( 500 ).json( { error: "Something went wrong" } );
	}
}; 
