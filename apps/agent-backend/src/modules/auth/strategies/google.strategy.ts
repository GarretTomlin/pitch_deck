import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface GoogleProfile {
  emails: Array<{ value: string }>;
  name: {
    givenName: string;
    familyName: string;
  };
  photos: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const typedProfile = profile as unknown as GoogleProfile;
    const email = typedProfile.emails[0].value;
    const name = `${typedProfile.name.givenName} ${typedProfile.name.familyName}`;
    const picture = typedProfile.photos[0]?.value;

    const user = await this.authService.validateOAuthUser({
      email,
      name,
      picture,
    });

    done(null, user);
  }
}