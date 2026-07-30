import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../auth/role.enum';
import {
  AddLessonDto,
  CreateCourseDto,
  CreateLibraryItemDto,
  CreateModuleDto,
  CreateTimerDto,
  CreateReportDto,
  CreateVideoAssetDto,
  CreateFileAssetDto,
  EngagementDto,
  ProgressDto,
  RoundLogDto,
  TimerStateDto,
  UpdateCourseDto,
} from './dto/workflow.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('Instructor content')
@ApiBearerAuth()
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.INSTRUCTOR)
export class InstructorController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get('courses')
  @ApiOperation({ summary: 'List courses and their enrollment statistics' })
  listCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.workflows.listInstructorCourses(user);
  }
  @Post('courses')
  @ApiOperation({ summary: 'Create a draft course' })
  createCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCourseDto,
  ) {
    return this.workflows.createCourse(user, dto);
  }
  @Patch('courses/:courseId')
  @ApiOperation({ summary: 'Edit a draft or published course' })
  updateCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.workflows.updateCourse(user, courseId, dto);
  }
  @Get('courses/:courseId/builder')
  @ApiOperation({ summary: 'Get the complete course-builder tree' })
  builder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.courseBuilder(user, courseId);
  }
  @Get('courses/:courseId/preview')
  @ApiOperation({ summary: 'Preview a course as a learner before publishing' })
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.coursePreview(user, courseId);
  }
  @Post('courses/:courseId/publish')
  @ApiOperation({ summary: 'Publish a course for learners' })
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.publishCourse(user, courseId);
  }
  @Post('courses/:courseId/archive')
  @ApiOperation({ summary: 'Archive a course and remove it from sale' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.archiveCourse(user, courseId);
  }
  @Post('courses/:courseId/unpublish')
  @ApiOperation({ summary: 'Return a published course to draft status' })
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.unpublishCourse(user, courseId);
  }
  @Post('courses/:courseId/duplicate')
  @ApiOperation({
    summary: 'Duplicate a course structure and reusable lessons',
  })
  duplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.duplicateCourse(user, courseId);
  }
  @Post('courses/:courseId/modules')
  @ApiOperation({ summary: 'Add an ordered module, week, or session' })
  addModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.workflows.addModule(user, courseId, dto);
  }
  @Post('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Add a reusable library lesson to a course' })
  addLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: AddLessonDto,
  ) {
    return this.workflows.addLesson(user, courseId, dto);
  }
  @Post('timers')
  @ApiOperation({ summary: 'Create a configurable lesson timer' })
  createTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimerDto,
  ) {
    return this.workflows.createTimer(user, dto);
  }
  @Post('lessons/:lessonId/timers/:timerId')
  @ApiOperation({ summary: 'Attach a timer configuration to a lesson' })
  attachTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Param('timerId') timerId: string,
  ) {
    return this.workflows.attachTimer(user, lessonId, timerId);
  }
  @Post('modules/:moduleId/timers/:timerId')
  @ApiOperation({ summary: 'Attach a timer to a module' })
  attachModuleTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId') moduleId: string,
    @Param('timerId') timerId: string,
  ) {
    return this.workflows.attachTimerToModule(user, moduleId, timerId);
  }
  @Post('courses/:courseId/timers/:timerId')
  @ApiOperation({ summary: 'Attach a timer to a whole course' })
  attachCourseTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Param('timerId') timerId: string,
  ) {
    return this.workflows.attachTimerToCourse(user, courseId, timerId);
  }
  @Post('lessons/:lessonId/videos')
  @ApiOperation({
    summary:
      'Register a processed HLS/DASH video from the configured video provider',
  })
  addVideo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateVideoAssetDto,
  ) {
    return this.workflows.addVideo(user, lessonId, dto);
  }
  @Post('lessons/:lessonId/files')
  @ApiOperation({
    summary:
      'Register a protected lesson document from the configured storage provider',
  })
  addFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateFileAssetDto,
  ) {
    return this.workflows.addFile(user, lessonId, dto);
  }
  @Get('library')
  @ApiOperation({ summary: 'Search the central reusable lesson library' })
  library(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
    @Query('minDuration') minDuration?: string,
    @Query('maxDuration') maxDuration?: string,
  ) {
    return this.workflows.library(
      user,
      search,
      type,
      tag,
      minDuration,
      maxDuration,
    );
  }
  @Post('library')
  @ApiOperation({ summary: 'Create a reusable lesson library item' })
  createLibrary(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLibraryItemDto,
  ) {
    return this.workflows.createLibraryItem(user, dto);
  }
  @Patch('library/:id')
  @ApiOperation({
    summary: 'Update a library item across every course that uses it',
  })
  updateLibrary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateLibraryItemDto,
  ) {
    return this.workflows.updateLibraryItem(user, id, dto);
  }
  @Get('reports/enrollments')
  @ApiOperation({
    summary: 'Exportable enrollment report data for the current tenant',
  })
  enrollmentReport(@CurrentUser() user: AuthenticatedUser) {
    return this.workflows.enrollmentReport(user);
  }
  @Get('analytics')
  @ApiOperation({
    summary: 'Course and lesson engagement analytics for the current tenant',
  })
  analytics(@CurrentUser() user: AuthenticatedUser) {
    return this.workflows.analytics(user);
  }
}

@ApiTags('Learning')
@ApiBearerAuth()
@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly workflows: WorkflowsService) {}
  @Get('my-courses')
  @ApiOperation({ summary: 'List the learner’s active courses and progress' })
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.workflows.myLearning(user);
  }
  @Get('courses/:courseId')
  @ApiOperation({
    summary: 'Get the complete purchased course and lesson progress',
  })
  course(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.workflows.learningCourse(user, courseId);
  }
  @Patch('lessons/:lessonId/progress')
  @ApiOperation({
    summary: 'Save watch time or completion for an enrolled lesson',
  })
  saveProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: ProgressDto,
  ) {
    return this.workflows.updateProgress(user, lessonId, dto);
  }
  @Post('lessons/:lessonId/engagement')
  @ApiOperation({ summary: 'Record learner watch/completion engagement' })
  engagement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: EngagementDto,
  ) {
    return this.workflows.recordEngagement(user, lessonId, dto);
  }
  @Get('notifications')
  @ApiOperation({ summary: 'List the authenticated learner’s notifications' })
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.workflows.notifications(user);
  }
  @Patch('notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  readNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.workflows.readNotification(user, notificationId);
  }
  @Post('reports')
  @ApiOperation({
    summary: 'Report content for instructor or platform moderation',
  })
  report(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.workflows.createReport(user, dto);
  }
  @Post('videos/:videoId/access')
  @ApiOperation({
    summary: 'Create a short-lived, learner-specific video playback session',
  })
  videoAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('videoId') videoId: string,
  ) {
    return this.workflows.createVideoAccess(user, videoId);
  }
  @Get('videos/:videoId/playback')
  @ApiOperation({
    summary: 'Resolve a valid short-lived video playback session',
  })
  playback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('videoId') videoId: string,
    @Query('token') token?: string,
  ) {
    if (!token)
      throw new BadRequestException('A video access token is required');
    return this.workflows.resolveVideoAccess(videoId, token, user.id);
  }
  @Post('documents/:fileId/access')
  @ApiOperation({
    summary: 'Create a short-lived protected document viewer session',
  })
  documentAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
  ) {
    return this.workflows.createDocumentAccess(user, fileId);
  }
  @Get('documents/:fileId/viewer')
  @ApiOperation({ summary: 'Resolve a protected, view-only document session' })
  documentViewer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Query('token') token?: string,
  ) {
    if (!token)
      throw new BadRequestException('A document access token is required');
    return this.workflows.resolveDocumentAccess(user, fileId, token);
  }
}

@ApiTags('Public catalog')
@Controller('public/:tenantSlug')
export class PublicCatalogController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get public instructor branding and page configuration',
  })
  site(@Param('tenantSlug') tenantSlug: string) {
    return this.workflows.publicSite(tenantSlug);
  }
  @Get('courses')
  @ApiOperation({ summary: 'Browse published courses for an instructor site' })
  catalog(@Param('tenantSlug') tenantSlug: string) {
    return this.workflows.publicCatalog(tenantSlug);
  }
  @Get('courses/:courseSlug')
  @ApiOperation({
    summary: 'View a published course and its free-preview lessons',
  })
  course(
    @Param('tenantSlug') tenantSlug: string,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.workflows.publicCourse(tenantSlug, courseSlug);
  }
  @Post('videos/:videoId/access')
  @ApiOperation({
    summary: 'Create a guest playback session for a free preview video',
  })
  publicVideoAccess(
    @Param('tenantSlug') tenantSlug: string,
    @Param('videoId') videoId: string,
  ) {
    return this.workflows.createPublicVideoAccess(tenantSlug, videoId);
  }
  @Get('videos/:videoId/playback')
  @ApiOperation({ summary: 'Resolve a guest free-preview playback session' })
  publicPlayback(
    @Param('tenantSlug') tenantSlug: string,
    @Param('videoId') videoId: string,
    @Query('token') token?: string,
  ) {
    if (!token)
      throw new BadRequestException('A preview access token is required');
    return this.workflows.resolvePublicVideoAccess(tenantSlug, videoId, token);
  }
}

@ApiTags('Public catalog')
@Controller('public-domain')
export class PublicDomainController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get(':domain')
  @ApiOperation({
    summary: 'Resolve a verified custom domain to its instructor site',
  })
  site(@Param('domain') domain: string) {
    return this.workflows.publicSiteByDomain(domain);
  }
}

@ApiTags('Timers')
@ApiBearerAuth()
@Controller('timers')
@UseGuards(JwtAuthGuard)
export class TimerController {
  constructor(private readonly workflows: WorkflowsService) {}
  @Post(':timerId/sessions')
  @ApiOperation({ summary: 'Start a persistent timer session' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timerId') timerId: string,
  ) {
    return this.workflows.startTimer(user, timerId);
  }
  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Resume a persisted timer session after reconnect/backgrounding',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.workflows.getTimerSession(user, sessionId);
  }
  @Post('sessions/:sessionId/pause')
  @ApiOperation({ summary: 'Pause a timer session' })
  pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: TimerStateDto,
  ) {
    return this.workflows.timerAction(user, sessionId, 'pause', dto);
  }
  @Post('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume a timer session' })
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: TimerStateDto,
  ) {
    return this.workflows.timerAction(user, sessionId, 'resume', dto);
  }
  @Post('sessions/:sessionId/finish')
  @ApiOperation({ summary: 'Finish a timer session' })
  finish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: TimerStateDto,
  ) {
    return this.workflows.timerAction(user, sessionId, 'finish', dto);
  }
  @Post('sessions/:sessionId/rounds')
  @ApiOperation({ summary: 'Record an AMRAP or circuit round' })
  logRound(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: RoundLogDto,
  ) {
    return this.workflows.logRound(user, sessionId, dto);
  }
}
