import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators.js';
import {
  buildOpenApiDocument,
  renderSwaggerExplorerHtml,
  type OpenApiSpec,
} from './openapi.builder.js';

@Controller('docs')
export class DocsController {
  @Public()
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getDocsUi(): string {
    return renderSwaggerExplorerHtml();
  }

  @Public()
  @Get('openapi.json')
  getOpenApiJson(): OpenApiSpec {
    return buildOpenApiDocument();
  }
}
