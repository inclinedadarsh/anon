import jwt
from sqlmodel import Session, select
from src.db import engine
from fastapi import APIRouter, Response, status, HTTPException, Request
from src.models.user import User
from fastapi.responses import RedirectResponse
import httpx
import os
from dotenv import load_dotenv, find_dotenv
from datetime import datetime, timezone, timedelta
from fastapi.responses import HTMLResponse

# from src.services.email import load_email_template
# from src.services.auth import hash_email
from src.services.auth import encrypt_refresh_token
from src.services.tags import assign_user_tags
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

import hmac
import hashlib
from supabase import create_client, Client

load_dotenv(find_dotenv())

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
IDENTIFIER_HASH_SECRET = os.getenv("IDENTIFIER_HASH_SECRET")

if not all(
    [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, JWT_SECRET_KEY]
):
    raise ValueError("Missing required Google OAuth or JWT environment variables.")

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IDENTIFIER_HASH_SECRET]):
    raise ValueError(
        "Missing Supabase or Identifier Hash environment variables for waitlist check."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
router = APIRouter()


def hash_identifier(id_str: str) -> str:
    secret_bytes = IDENTIFIER_HASH_SECRET.encode("utf-8")
    id_bytes = id_str.encode("utf-8")
    hashed_object = hmac.new(secret_bytes, id_bytes, hashlib.sha256)
    return hashed_object.hexdigest()


@router.get("/google/login", tags=["auth"], include_in_schema=False)
async def google_login():
    """
    Redirects the user to google's oauth 2.0 server to initiate the login.
    """
    scope = "email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return RedirectResponse(url=auth_url)


@router.get("/google/callback", tags=["auth"], include_in_schema=False)
async def google_callback(
    request: Request, code: str = None, error: str = None, state: str = None
):
    """
    Handles the callback from google after user authentication.
    Exchanges the authorization code for access token, validates user,
    creates/updates user, generates platform JWT, and redirects
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google login error: {error}",
        )
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code from Google",
        )

    referral_code = None
    if state and state.startswith("referral_"):
        referral_code = state.replace("referral_", "")
        print(f"Referral signup detected with code: {referral_code}")

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_json = token_response.json()
        except httpx.HTTPStatusError as e:
            print(
                f"HTTP error exchanging code: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to exchange authorization code with Google.",
            )
        except Exception as e:
            print(f"Error exchanging code: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred during token exchange.",
            )

    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    id_token_jwt = token_json.get("id_token")

    if not id_token_jwt:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing id_token from Google.",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            id_token_jwt, google_requests.Request(), GOOGLE_CLIENT_ID
        )

        google_id = id_info.get("sub")
        email = id_info.get("email")
        email_verified = id_info.get("email_verified")

        if not all([google_id, email, email_verified]):
            raise ValueError(
                "ID token missing required fields (sub, email, email_verified)."
            )

    except ValueError as e:
        print(f"ID Token Verification Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID token from Google.",
        )
    except Exception as e:
        print(f"Unexpected error verifying ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify Google ID token.",
        )

    if not email.endswith("@kkwagh.edu.in"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to @kkwagh.edu.in emails only.",
        )

    user = None
    with Session(engine) as session:
        user = session.exec(select(User).where(User.google_id == google_id)).first()

    if user:
        with Session(engine) as session:
            if refresh_token:
                user.encrypted_refresh_token = encrypt_refresh_token(refresh_token)
                session.add(user)
                session.commit()
                session.refresh(user)
            print(f"Existing user logged in: {user.id}")
    else:
        allowed_to_signup = False
        signup_source = None
        referrer_id = None

        try:
            hashed_google_id = hash_identifier(google_id)
            waitlist_query = (
                supabase.table("waitlist_users")
                .select("hashed_google_id")
                .eq("hashed_google_id", hashed_google_id)
                .execute()
            )

            if waitlist_query.data:
                allowed_to_signup = True
                signup_source = "waitlist"
                print(
                    f"User {hashed_google_id} found in Supabase waitlist access allowed."
                )
        except Exception as e:
            print(f"Error checking Supabase waitlist: {e}")

        if not allowed_to_signup:
            if referral_code:
                with Session(engine) as session:
                    from src.services.referral import validate_referral_code

                    is_valid, referral_code_obj, referrer = validate_referral_code(
                        session, referral_code
                    )

                    if is_valid and referrer:
                        allowed_to_signup = True
                        signup_source = "referral"
                        referrer_id = referrer.id
                        print(
                            f"User {hashed_google_id} authorized via valid referral code {referral_code}"
                        )
                    else:
                        print(f"Invalid referral code {referral_code} provided")
            else:
                print(
                    f"User {hashed_google_id} not on waitlist and no referral code provided."
                )

        if not allowed_to_signup:
            print(f"User {hashed_google_id} not authorized for access.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only waitlisted users or referred users can access Anon. Please ask your friend for a referral.",
            )

        with Session(engine) as session:
            encrypted_rt = (
                encrypt_refresh_token(refresh_token) if refresh_token else None
            )

            new_user = User(
                google_id=google_id,
                encrypted_refresh_token=encrypted_rt,
                username=None,
                referred_by=referrer_id,
            )
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            user = new_user
            print(f"New user created: {user.id}")

            # assign tags to new user
            user_tags = assign_user_tags(user, signup_source)
            if user_tags:
                user.tags = user_tags
                session.add(user)
                session.commit()
                session.refresh(user)
                print(f"Tags assigned to user {user.id}: {user_tags}")

            if referrer_id and signup_source == "referral":
                from src.services.referral import complete_referral_simple

                success = complete_referral_simple(
                    session, referrer_id, user.id, referral_code
                )
                if success:
                    print(f"Referral completed: {referrer_id} -> {user.id}")

    if not user or user.id is None:
        raise HTTPException(
            status_code=500, detail="Failed to retrieve user data after login/signup."
        )

    jwt_payload = {
        "sub": str(user.id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    platform_token = jwt.encode(jwt_payload, JWT_SECRET_KEY, algorithm="HS256")

    frontend_redirect_base = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if user.username is None:
        redirect_url = f"{frontend_redirect_base}/profile-setup"
    else:
        redirect_url = f"{frontend_redirect_base}/home"

    response = RedirectResponse(url=redirect_url)
    response.set_cookie(
        key="access_token",
        value=platform_token,
        httponly=True,
        secure=True if "https" in frontend_redirect_base else False,
        samesite="Lax",
        max_age=3600,
        path="/",
    )
    print(f"jwt cookie set (domain removed). redirecting to {redirect_url}")
    return response


@router.post("/logout", status_code=status.HTTP_200_OK, tags=["auth"])
async def logout(response: Response):
    """
    Logout user by clearing the access token cookie.
    """
    print("logout requested, clearing the access token cookie.")
    frontend_redirect_base = os.getenv("FRONTEND_URL", "http://localhost:3000")
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True if "https" in frontend_redirect_base else False,
        samesite="Lax",
        path="/",
    )
    return {"message": "logout successful"}


# @router.post(
#     "/signup",
#     tags=["auth"],
#     response_model=UserPublic,
#     status_code=status.HTTP_201_CREATED,
# )
# def signup(user: UserCreate):
#     """Create a new user with a hashed password and return the user."""
#     try:
#         with Session(engine) as session:
#             # Hash the email first
#             hashed_email = hash_email(user.email)
#             # Check for existing user with same username or email
#             # TODO: The problem is if someone creates account without verifying, the id will be given to it
#             # so if we want to implement something like first 100, then we need to rely on id
#             # TODO: add created_at and updated_at fields
#             # Check for existing user with same username or hashed email
#             results = session.exec(
#                 select(User).where(
#                     or_(
#                         User.username == user.username,
#                         User.hashed_email == hashed_email,
#                     )
#                 )
#             )
#             existing_user = results.first()

#             if existing_user:
#                 if not existing_user.is_verified:
#                     session.delete(existing_user)
#                     session.commit()
#                 # elif existing_user.username == user.username and existing_user.is_verified:
#                 # TODO: Fix race condition, right now we're just locking the username for saftey
#                 elif existing_user.username == user.username:
#                     raise HTTPException(
#                         status_code=status.HTTP_409_CONFLICT,
#                         detail="Username already exists",
#                     )
#                 elif existing_user.hashed_email == hashed_email:
#                     raise HTTPException(
#                         status_code=status.HTTP_409_CONFLICT,
#                         detail="Email already exists and is verified",
#                     )

#             # Hash password
#             hashed_password = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())

#             # Generate verification token
#             token = secrets.token_urlsafe(32)
#             token_expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

#             # Send verification email
#             verification_link = f"http://127.0.0.1:8000/auth/verify-token?token={token}"
#             email_html = load_email_template(
#                 "verification.html", verification_link=verification_link
#             )
#             resend.api_key = os.getenv("RESEND_API_KEY")

#             params: resend.Emails.SendParams = {
#                 "from": "anon@adarshdubey.com",
#                 "to": user.email,
#                 "subject": "Verify your email for Anon",
#                 "html": email_html,
#             }

#             email: resend.Email = resend.Emails.send(params)
#             print(email)

#             # Create and save user
#             db_user = User(
#                 username=user.username,
#                 hashed_email=hashed_email,
#                 hashed_password=hashed_password,
#                 verification_token=token,
#                 verification_token_expires=token_expiry,
#             )
#             session.add(db_user)
#             session.commit()
#             session.refresh(db_user)

#             return db_user
#     except ValueError as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=str(e),
#         )


# @router.post(
#     "/login",
#     tags=["auth"],
#     status_code=status.HTTP_200_OK,
#     response_model=UserLoginResponse,
# )
# async def login(login_user: UserLoginRequest):
#     """
#     Authenticate user by username and password, and return a JWT token.
#     """
#     with Session(engine) as session:
#         # Fetch user by username
#         results = session.exec(select(User).where(User.username == login_user.username))
#         user = results.first()

#         # Validate user exists
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid username or password",
#             )

#         # Validate user is verified
#         if not user.is_verified:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="User is not verified! Please verify your email before logging in",
#             )

#         # Validate user exists and password matches
#         if not bcrypt.checkpw(login_user.password.encode(), user.hashed_password):
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid username or password",
#             )

#         # Generate JWT token
#         JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
#         token = jwt.encode(
#             {"username": user.username, "id": str(user.id)},
#             key=JWT_SECRET_KEY,
#             algorithm="HS256",
#         )
#         return {"access_token": token, "token_type": "bearer"}


# @router.get(
#     "/verify-token",
#     tags=["auth"],
#     status_code=status.HTTP_200_OK,
#     response_model=UserPublic,
# )
# def verify_token(token: str):
#     """
#     Verify user by token and return the user.
#     """
#     with Session(engine) as session:
#         # Fetch user by verification token
#         results = session.exec(select(User).where(User.verification_token == token))
#         user = results.first()

#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid or Expired token",
#             )

#         # Ensure token expiry datetime is timezone-aware
#         token_expires = user.verification_token_expires
#         if token_expires.tzinfo is None:
#             token_expires = token_expires.replace(tzinfo=timezone.utc)

#         # Compare timezone-aware datetimes
#         if token_expires < datetime.now(timezone.utc):
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Token has expired",
#             )

#         # Update user to be verified
#         user.is_verified = True
#         user.verification_token = None  # Clear the token after use
#         user.verification_token_expires = None  # Clear the expiry after use
#         session.add(user)
#         session.commit()
#         session.refresh(user)

#         return user
